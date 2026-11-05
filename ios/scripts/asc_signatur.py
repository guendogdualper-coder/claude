#!/usr/bin/env python3
"""Vertriebszertifikat und App-Store-Profil über die App-Store-Connect-API holen (seit 13.85, für den CI-Bau).

Warum: Das unsignierte Archiv wurde beim Export nicht mit Apples Cloud-Zertifikat neu signiert, der Upload scheiterte
mit „Invalid Signature“ (90035). Darum holt sich der Bau jetzt selbst ein „Apple Distribution“-Zertifikat (neuer
Schlüssel bei jedem Lauf) und ein passendes App-Store-Profil und signiert damit ganz normal von Hand.

Nur Standardbibliothek + openssl (JWT ES256 über `openssl dgst`), damit auf dem Mac-Runner nichts installiert werden muss.

Aufruf:  python3 asc_signatur.py <ausgabe-ordner>
Umgebung: KEY_ID, ISSUER_ID, KEY_DATEI (Pfad zur .p8), BUNDLE_ID, optional PROFIL_NAME
Ausgabe im Ordner: key.pem (privater Schlüssel), cert.cer (DER), profil.mobileprovision, werte.env (PROFIL_UUID, PROFIL_NAME)
"""
import base64
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

API = 'https://api.appstoreconnect.apple.com/v1'
KEY_ID = os.environ['KEY_ID']
ISSUER_ID = os.environ['ISSUER_ID']
KEY_DATEI = os.environ['KEY_DATEI']
BUNDLE_ID = os.environ.get('BUNDLE_ID', 'de.seelenstein.spiel')
PROFIL_NAME = os.environ.get('PROFIL_NAME', 'Seelenstein CI App Store')


def b64u(b):
    return base64.urlsafe_b64encode(b).rstrip(b'=').decode()


def der_zu_roh(der):
    """ECDSA-Signatur (DER: SEQUENCE{INTEGER r, INTEGER s}) in 64 Byte r||s umwandeln."""
    assert der[0] == 0x30, 'keine DER-Folge'
    i = 2 if der[1] < 0x80 else 2 + (der[1] & 0x7F)
    werte = []
    for _ in range(2):
        assert der[i] == 0x02, 'keine Ganzzahl'
        n = der[i + 1]
        werte.append(int.from_bytes(der[i + 2:i + 2 + n], 'big'))
        i += 2 + n
    return werte[0].to_bytes(32, 'big') + werte[1].to_bytes(32, 'big')


def jwt():
    jetzt = int(time.time())
    kopf = {'alg': 'ES256', 'kid': KEY_ID, 'typ': 'JWT'}
    inhalt = {'iss': ISSUER_ID, 'iat': jetzt, 'exp': jetzt + 1100, 'aud': 'appstoreconnect-v1'}
    nachricht = b64u(json.dumps(kopf, separators=(',', ':')).encode()) + '.' + \
        b64u(json.dumps(inhalt, separators=(',', ':')).encode())
    der = subprocess.run(['openssl', 'dgst', '-sha256', '-sign', KEY_DATEI],
                         input=nachricht.encode(), capture_output=True, check=True).stdout
    return nachricht + '.' + b64u(der_zu_roh(der))


def api(methode, pfad, daten=None):
    url = pfad if pfad.startswith('http') else API + pfad
    anfrage = urllib.request.Request(url, method=methode, headers={
        'Authorization': 'Bearer ' + jwt(), 'Content-Type': 'application/json'})
    if daten is not None:
        anfrage.data = json.dumps(daten).encode()
    try:
        with urllib.request.urlopen(anfrage, timeout=60) as antwort:
            text = antwort.read()
            return antwort.status, (json.loads(text) if text else {})
    except urllib.error.HTTPError as fehler:
        text = fehler.read().decode(errors='replace')
        return fehler.code, {'fehler': text}


def pruefen(status, antwort, was):
    if status >= 300:
        print(f'::error::App Store Connect API ({was}): HTTP {status} {antwort.get("fehler", "")[:800]}')
        sys.exit(1)


def bundle_id_holen():
    status, antwort = api('GET', f'/bundleIds?filter[identifier]={BUNDLE_ID}&limit=200')
    pruefen(status, antwort, 'Bundle-ID suchen')
    for eintrag in antwort.get('data', []):
        if eintrag['attributes']['identifier'] == BUNDLE_ID:
            return eintrag['id']
    print(f'::error::Bundle-ID {BUNDLE_ID} gibt es im Entwicklerkonto nicht (Identifiers → App IDs).')
    sys.exit(1)


def zertifikat_anlegen(ordner):
    schluessel = os.path.join(ordner, 'key.pem')
    csr = os.path.join(ordner, 'csr.pem')
    subprocess.run(['openssl', 'genrsa', '-out', schluessel, '2048'], check=True, capture_output=True)
    subprocess.run(['openssl', 'req', '-new', '-key', schluessel, '-out', csr,
                    '-subj', '/emailAddress=kontakt@seelenstein.online/CN=Seelenstein CI/C=DE'],
                   check=True, capture_output=True)
    with open(csr) as f:
        csr_text = f.read()
    daten = {'data': {'type': 'certificates',
                      'attributes': {'certificateType': 'DISTRIBUTION', 'csrContent': csr_text}}}
    for versuch in range(3):
        status, antwort = api('POST', '/certificates', daten)
        if status < 300:
            break
        if status == 409 and versuch < 2:
            # Höchstzahl an Vertriebszertifikaten erreicht: das älteste (eines früheren CI-Laufs) zurückziehen
            s2, liste = api('GET', '/certificates?filter[certificateType]=DISTRIBUTION,IOS_DISTRIBUTION&limit=200')
            pruefen(s2, liste, 'Zertifikate auflisten')
            alle = sorted(liste.get('data', []), key=lambda c: c['attributes'].get('expirationDate') or '')
            if not alle:
                pruefen(status, antwort, 'Zertifikat anlegen')
            alt = alle[0]
            print(f'Höchstzahl erreicht, ziehe altes Vertriebszertifikat zurück: {alt["attributes"].get("name")} '
                  f'(läuft ab {alt["attributes"].get("expirationDate")})')
            s3, a3 = api('DELETE', f'/certificates/{alt["id"]}')
            pruefen(s3, a3, 'altes Zertifikat zurückziehen')
            continue
        pruefen(status, antwort, 'Zertifikat anlegen')
    zert = antwort['data']
    with open(os.path.join(ordner, 'cert.cer'), 'wb') as f:
        f.write(base64.b64decode(zert['attributes']['certificateContent']))
    print(f'Vertriebszertifikat angelegt: {zert["attributes"].get("name")} (läuft ab {zert["attributes"].get("expirationDate")})')
    return zert['id']


def profil_anlegen(ordner, bundle, zert_id):
    # alte Profile gleichen Namens löschen (sie hängen an alten Zertifikaten)
    status, antwort = api('GET', '/profiles?limit=200')
    pruefen(status, antwort, 'Profile auflisten')
    for p in antwort.get('data', []):
        if p['attributes'].get('name') == PROFIL_NAME:
            api('DELETE', f'/profiles/{p["id"]}')
    daten = {'data': {'type': 'profiles',
                      'attributes': {'name': PROFIL_NAME, 'profileType': 'IOS_APP_STORE'},
                      'relationships': {
                          'bundleId': {'data': {'type': 'bundleIds', 'id': bundle}},
                          'certificates': {'data': [{'type': 'certificates', 'id': zert_id}]}}}}
    status, antwort = api('POST', '/profiles', daten)
    pruefen(status, antwort, 'Profil anlegen')
    attr = antwort['data']['attributes']
    with open(os.path.join(ordner, 'profil.mobileprovision'), 'wb') as f:
        f.write(base64.b64decode(attr['profileContent']))
    print(f'App-Store-Profil angelegt: {attr["name"]} ({attr["uuid"]})')
    return attr['uuid']


def main():
    ordner = sys.argv[1]
    os.makedirs(ordner, exist_ok=True)
    bundle = bundle_id_holen()
    zert_id = zertifikat_anlegen(ordner)
    uuid = profil_anlegen(ordner, bundle, zert_id)
    with open(os.path.join(ordner, 'werte.env'), 'w') as f:
        f.write(f'PROFIL_UUID={uuid}\nPROFIL_NAME={PROFIL_NAME}\n')


if __name__ == '__main__':
    main()

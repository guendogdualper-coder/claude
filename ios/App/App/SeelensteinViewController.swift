import UIKit
import WebKit
import Capacitor

/// Hauptansicht der App: ein Capacitor-WebView, das https://seelenstein.online/ lädt (siehe capacitor.config.json).
///
/// Hier wird nur eingestellt, was sich nicht über capacitor.config.json regeln lässt:
/// - Wischgesten am Rand lösen nicht sofort das System aus (Statusleiste und Home-Leiste blendet das in Capacitor
///   eingebaute Plugin „SystemBars“ aus, siehe capacitor.config.json → plugins.SystemBars.hidden)
/// - kein Gummiband-Effekt, keine Zurück-Wischgeste, keine Link-Vorschau
/// - Ton und Musik dürfen ohne extra Tippen starten (Web Audio, <audio>)
/// - Bildschirm bleibt an, solange die App im Vordergrund ist (wie bei Spielen üblich)
class SeelensteinViewController: CAPBridgeViewController {

    // Wischen vom Rand: erst beim zweiten Wischen reagiert das System – sonst landet man mitten im Kampf im Kontrollzentrum
    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge { .all }

    override func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let config = super.webViewConfiguration(for: instanceConfiguration)
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.allowsPictureInPictureMediaPlayback = false
        config.allowsAirPlayForMediaPlayback = false
        config.dataDetectorTypes = []
        // Spielstände liegen im localStorage: der Standard-Datenspeicher ist dauerhaft (nicht „privat“)
        config.websiteDataStore = WKWebsiteDataStore.default()
        return config
    }

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        guard let webView = webView else { return }
        webView.scrollView.bounces = false
        webView.scrollView.alwaysBounceVertical = false
        webView.scrollView.alwaysBounceHorizontal = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.allowsBackForwardNavigationGestures = false
        webView.allowsLinkPreview = false
        webView.backgroundColor = UIColor(red: 0x12 / 255.0, green: 0x10 / 255.0, blue: 0x0C / 255.0, alpha: 1)
        webView.scrollView.backgroundColor = webView.backgroundColor
        #if DEBUG
        // In Testversionen (Debug) lässt sich die Seite mit Safari auf einem Mac untersuchen
        if #available(iOS 16.4, *) {
            webView.isInspectable = true
        }
        #endif
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        UIApplication.shared.isIdleTimerDisabled = true
        setNeedsUpdateOfHomeIndicatorAutoHidden()
        setNeedsUpdateOfScreenEdgesDeferringSystemGestures()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        UIApplication.shared.isIdleTimerDisabled = false
    }
}

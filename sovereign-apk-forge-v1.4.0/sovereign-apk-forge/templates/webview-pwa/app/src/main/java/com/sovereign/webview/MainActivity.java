package com.sovereign.webview;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebSettings;
import android.webkit.WebChromeClient;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;

/**
 * Sovereign PWA wrapper — full-screen WebView loading bundled local assets.
 * No network required. WebAudio / WebGL / canvas all work in hardware-accelerated WebView.
 * Evidence: SIMULATED until installed + launched on device.
 */
public class MainActivity extends Activity {

    private WebView webView;
    private static final String ENTRY = "file:///android_asset/index.html";
    private static final String EVIDENCE = "SIMULATED";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Full-screen immersive
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN);
        int uiOpts = View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                   | View.SYSTEM_UI_FLAG_FULLSCREEN
                   | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                   | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                   | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                   | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN;
        getWindow().getDecorView().setSystemUiVisibility(uiOpts);

        webView = new WebView(this);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);           // PWA requires JS
        s.setDomStorageEnabled(true);           // localStorage / IndexedDB
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);             // local assets
        s.setAllowContentAccess(false);         // sovereign: no content://
        s.setAllowUniversalAccessFromFileURLs(false);  // sovereign: no cross-origin
        s.setMediaPlaybackRequiresUserGesture(false);   // WebAudio autoplay
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);     // assets are local
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW); // sovereign default

        webView.setWebChromeClient(new WebChromeClient()); // enables WebAudio + fullscreen video
        webView.loadUrl(ENTRY);
        setContentView(webView);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) { webView.destroy(); webView = null; }
        super.onDestroy();
    }
}

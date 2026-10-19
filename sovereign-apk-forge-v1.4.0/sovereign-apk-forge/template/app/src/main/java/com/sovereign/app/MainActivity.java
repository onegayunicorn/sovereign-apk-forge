package com.sovereign.app;

import android.app.Activity;
import android.os.Bundle;
import android.widget.TextView;
import android.widget.LinearLayout;
import android.graphics.Color;
import android.view.Gravity;

/**
 * Sovereign template activity — zero network, zero ads, deterministic.
 * Evidence label: SIMULATED until installed and verified on device.
 */
public class MainActivity extends Activity {

    private static final String EVIDENCE_LABEL = "SIMULATED";
    private static final String BUILD_TAG = "sovereign-apk-forge/v1.0.0";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setGravity(Gravity.CENTER);
        layout.setBackgroundColor(0xFF0A0F2A); // Sovereign deep blue
        layout.setPadding(48, 48, 48, 48);

        TextView title = new TextView(this);
        title.setText("Sovereign App");
        title.setTextColor(0xFF00E7FF); // cyan
        title.setTextSize(28);
        title.setGravity(Gravity.CENTER);
        title.setPadding(0, 0, 0, 24);

        TextView subtitle = new TextView(this);
        subtitle.setText("Built with Sovereign APK Forge\nTerminal-first · Zero-cloud · Deterministic");
        subtitle.setTextColor(0xFFF7FAFF);
        subtitle.setTextSize(14);
        subtitle.setGravity(Gravity.CENTER);
        subtitle.setPadding(0, 0, 0, 32);

        TextView evidence = new TextView(this);
        evidence.setText("Evidence: " + EVIDENCE_LABEL + "\nBuilder: " + BUILD_TAG);
        evidence.setTextColor(0xFFFFB000); // amber
        evidence.setTextSize(12);
        evidence.setGravity(Gravity.CENTER);
        evidence.setTypeface(null, android.graphics.Typeface.MONOSPACE);

        layout.addView(title);
        layout.addView(subtitle);
        layout.addView(evidence);

        setContentView(layout);
    }
}

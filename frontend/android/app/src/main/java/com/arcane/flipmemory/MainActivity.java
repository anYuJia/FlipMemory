package com.arcane.flipmemory;

import android.os.Bundle;
import android.view.WindowManager;
import android.view.Display;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // 开启高帧率 (HFR) 支持
        // 针对 Android 11+ (API 30+) 动态设置最佳刷新率
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
            WindowManager.LayoutParams params = getWindow().getAttributes();
            Display display = getDisplay();
            if (display != null) {
                Display.Mode[] supportedModes = display.getSupportedModes();
                float maxRefreshRate = 60;
                Display.Mode bestMode = null;
                
                for (Display.Mode mode : supportedModes) {
                    if (mode.getRefreshRate() > maxRefreshRate) {
                        maxRefreshRate = mode.getRefreshRate();
                        bestMode = mode;
                    }
                }
                
                if (bestMode != null) {
                    params.preferredDisplayModeId = bestMode.getModeId();
                    getWindow().setAttributes(params);
                }
            }
        }
    }
}

package io.github.xhyugsx.financas;

import android.os.Build;
import android.os.Bundle;
import android.view.Display;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetPlugin.class);
        registerPlugin(ContaGooglePlugin.class);
        super.onCreate(savedInstanceState);
        pedirTaxaMaisAlta();
    }

    // Alguns fabricantes deixam as apps instaladas fora da loja a 60 Hz: pede o modo com a taxa
    // de atualização mais alta na resolução atual (como o Chrome faz), para as animações ficarem fluidas.
    private void pedirTaxaMaisAlta() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return;
        Display ecra = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R ? getDisplay() : getWindowManager().getDefaultDisplay();
        if (ecra == null) return;
        Display.Mode atual = ecra.getMode(), melhor = atual;
        for (Display.Mode m : ecra.getSupportedModes()) {
            if (m.getPhysicalWidth() == atual.getPhysicalWidth() && m.getPhysicalHeight() == atual.getPhysicalHeight()
                    && m.getRefreshRate() > melhor.getRefreshRate()) melhor = m;
        }
        WindowManager.LayoutParams p = getWindow().getAttributes();
        p.preferredDisplayModeId = melhor.getModeId();
        getWindow().setAttributes(p);
    }
}

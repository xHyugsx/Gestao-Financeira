package io.github.xhyugsx.financas;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Recebe da app os textos dos widgets (já com «Valores ocultos» aplicado), guarda-os e redesenha os widgets. */
@CapacitorPlugin(name = "Widget")
public class WidgetPlugin extends Plugin {
    @PluginMethod
    public void atualizar(PluginCall call) {
        String dados = call.getString("dados", "{}");
        getContext().getSharedPreferences(Widgets.PREFS, 0).edit().putString(Widgets.CHAVE, dados).apply();
        Widgets.redesenharTodos(getContext());
        call.resolve();
    }
}

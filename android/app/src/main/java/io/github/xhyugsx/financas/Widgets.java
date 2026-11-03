package io.github.xhyugsx.financas;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

/** Desenho dos três widgets (grande, só gastos, só «+»). Os dados vêm da app (WidgetPlugin). */
public final class Widgets {
    static final String PREFS = "financas_widget";
    static final String CHAVE = "dados";
    private static final int[] PONTOS = { R.id.p0, R.id.p1, R.id.p2, R.id.p3, R.id.p4, R.id.p5, R.id.p6 };

    private Widgets() {}

    static JSONObject dados(Context c) {
        try { return new JSONObject(c.getSharedPreferences(PREFS, 0).getString(CHAVE, "{}")); } catch (Exception e) { return new JSONObject(); }
    }

    private static PendingIntent abrir(Context c, String acao, int codigo) {
        Intent i = acao == null ? c.getPackageManager().getLaunchIntentForPackage(c.getPackageName())
            : new Intent(Intent.ACTION_VIEW, Uri.parse("financas://acao/" + acao)).setPackage(c.getPackageName());
        if (i == null) i = new Intent(c, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(c, codigo, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static int corDoPonto(String p) {
        switch (p) {
            case "q1": return Color.parseColor("#22C55E");
            case "q2": return Color.parseColor("#FACC15");
            case "q3": return Color.parseColor("#F97316");
            case "q4": return Color.parseColor("#EF4444");
            case "sem": return Color.parseColor("#22C55E");
            default: return Color.parseColor("#55FFFFFF");
        }
    }

    private static void pontos(RemoteViews v, JSONObject d) {
        JSONArray l = d.optJSONArray("pontos");
        for (int i = 0; i < PONTOS.length; i++) {
            String p = l != null && i < l.length() ? l.optString(i, "futuro") : "futuro";
            v.setTextViewText(PONTOS[i], p.startsWith("q") ? "●" : "○");
            v.setTextColor(PONTOS[i], corDoPonto(p));
        }
    }

    static RemoteViews grande(Context c) {
        JSONObject d = dados(c);
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_grande);
        v.setTextViewText(R.id.titulo, ("Finanças · " + d.optString("mes", "")).toUpperCase());
        v.setTextViewText(R.id.rend_rotulo, d.optString("rendimentoRotulo", "Rendimento"));
        v.setTextViewText(R.id.rendimento, d.optString("rendimento", "—"));
        v.setTextViewText(R.id.gastos, d.optString("gastos", "—"));
        pontos(v, d);
        v.setOnClickPendingIntent(R.id.raiz, abrir(c, null, 10));
        v.setOnClickPendingIntent(R.id.bt_mais, abrir(c, "despesa", 11));
        v.setOnClickPendingIntent(R.id.bt_jarvis, abrir(c, "jarvis", 12));
        return v;
    }

    static RemoteViews gastos(Context c) {
        JSONObject d = dados(c);
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_gastos);
        v.setTextViewText(R.id.gastos, d.optString("gastos", "—"));
        v.setTextViewText(R.id.comparacao, d.optString("comparacao", ""));
        v.setOnClickPendingIntent(R.id.raiz, abrir(c, null, 20));
        return v;
    }

    static RemoteViews mais(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_mais);
        v.setOnClickPendingIntent(R.id.raiz, abrir(c, "despesa", 30));
        return v;
    }

    static void redesenhar(Context c, AppWidgetManager m, Class<? extends AppWidgetProvider> tipo) {
        int[] ids = m.getAppWidgetIds(new ComponentName(c, tipo));
        if (ids.length == 0) return;
        RemoteViews v = tipo == WidgetGrande.class ? grande(c) : tipo == WidgetGastos.class ? gastos(c) : mais(c);
        m.updateAppWidget(ids, v);
    }

    static void redesenharTodos(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        redesenhar(c, m, WidgetGrande.class);
        redesenhar(c, m, WidgetGastos.class);
        redesenhar(c, m, WidgetMais.class);
    }
}

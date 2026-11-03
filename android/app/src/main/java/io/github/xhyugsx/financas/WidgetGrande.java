package io.github.xhyugsx.financas;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;

public class WidgetGrande extends AppWidgetProvider {
    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) { Widgets.redesenhar(c, m, WidgetGrande.class); }
}

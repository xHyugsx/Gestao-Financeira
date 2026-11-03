package io.github.xhyugsx.financas;

import android.Manifest;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;

/**
 * Ditado no «+»: o microfone só liga quando a app pede (botão tocado, app aberta) e desliga-se ao terminar a frase,
 * ao pedir «parar» ou quando a app sai do ecrã (handleOnPause). Prefere o reconhecimento no próprio telemóvel;
 * o reconhecimento normal (que pode usar a rede) só é usado se a app o pedir explicitamente (permitirRede).
 */
@CapacitorPlugin(name = "Voz", permissions = { @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "microfone") })
public class VozPlugin extends Plugin {
    private SpeechRecognizer reconhecedor;
    private PluginCall pedido;

    @PluginMethod
    public void ouvir(PluginCall call) {
        if (getPermissionState("microfone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microfone", call, "depoisDaAutorizacao");
            return;
        }
        comecar(call);
    }

    @PermissionCallback
    private void depoisDaAutorizacao(PluginCall call) {
        if (getPermissionState("microfone") == PermissionState.GRANTED) comecar(call);
        else call.reject("Sem autorização para o microfone", "sem-autorizacao");
    }

    private void comecar(PluginCall call) {
        boolean permitirRede = Boolean.TRUE.equals(call.getBoolean("permitirRede", false));
        getActivity().runOnUiThread(() -> {
            terminar("Outro ditado começou");
            boolean noTelemovel = Build.VERSION.SDK_INT >= 31 && SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext());
            if (!noTelemovel && !permitirRede) { call.reject("Reconhecimento no telemóvel indisponível", "sem-offline"); return; }
            if (!noTelemovel && !SpeechRecognizer.isRecognitionAvailable(getContext())) { call.reject("Sem reconhecimento de voz", "indisponivel"); return; }
            reconhecedor = noTelemovel ? SpeechRecognizer.createOnDeviceSpeechRecognizer(getContext()) : SpeechRecognizer.createSpeechRecognizer(getContext());
            pedido = call;
            final boolean local = noTelemovel;
            reconhecedor.setRecognitionListener(new RecognitionListener() {
                @Override public void onReadyForSpeech(Bundle b) { notifyListeners("estado", new JSObject().put("estado", "a-ouvir")); }
                @Override public void onBeginningOfSpeech() {}
                @Override public void onRmsChanged(float v) {}
                @Override public void onBufferReceived(byte[] b) {}
                @Override public void onEndOfSpeech() { notifyListeners("estado", new JSObject().put("estado", "a-pensar")); }
                @Override public void onPartialResults(Bundle b) {
                    String t = primeiro(b);
                    if (t != null) notifyListeners("parcial", new JSObject().put("texto", t));
                }
                @Override public void onResults(Bundle b) {
                    PluginCall c = pedido; pedido = null;
                    String t = primeiro(b);
                    libertar();
                    if (c != null) c.resolve(new JSObject().put("texto", t == null ? "" : t).put("noTelemovel", local));
                }
                @Override public void onError(int erro) {
                    PluginCall c = pedido; pedido = null;
                    libertar();
                    // 12/13: língua não suportada ou não instalada no reconhecimento do telemóvel
                    String codigo = (erro == 12 || erro == 13) && local ? "sem-offline" : erro == SpeechRecognizer.ERROR_NO_MATCH || erro == SpeechRecognizer.ERROR_SPEECH_TIMEOUT ? "sem-fala" : "erro-" + erro;
                    if (c != null) c.reject("Erro no reconhecimento de voz", codigo);
                }
                @Override public void onEvent(int t, Bundle b) {}
            });
            Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "pt-PT");
            i.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
            i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
            reconhecedor.startListening(i);
        });
    }

    private static String primeiro(Bundle b) {
        ArrayList<String> l = b == null ? null : b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        return l == null || l.isEmpty() ? null : l.get(0);
    }

    @PluginMethod
    public void parar(PluginCall call) {
        getActivity().runOnUiThread(() -> { terminar("Parado"); call.resolve(); });
    }

    private void libertar() {
        if (reconhecedor != null) { reconhecedor.cancel(); reconhecedor.destroy(); reconhecedor = null; }
    }

    private void terminar(String motivo) {
        libertar();
        if (pedido != null) { PluginCall c = pedido; pedido = null; c.reject(motivo, "parado"); }
    }

    // A app saiu do ecrã (segundo plano, ecrã desligado, outra app): o microfone desliga-se logo.
    @Override
    protected void handleOnPause() { getActivity().runOnUiThread(() -> terminar("A app saiu do ecrã")); super.handleOnPause(); }

    @Override
    protected void handleOnDestroy() { libertar(); super.handleOnDestroy(); }
}

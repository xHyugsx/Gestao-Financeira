package io.github.xhyugsx.financas;

import android.app.Activity;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.AuthorizationResult;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.Scope;
import java.util.Collections;

/**
 * Google Drive na APK: autorização nativa do Android (o Google bloqueia o login dentro de WebViews). Só o âmbito
 * drive.file (a app vê apenas os ficheiros que cria). A APK é reconhecida pelo pacote e pela SHA-1 da chave de
 * assinatura (ID de cliente «Android» na Google Cloud): não há ID de cliente no código.
 */
@CapacitorPlugin(name = "ContaGoogle")
public class ContaGooglePlugin extends Plugin {
    private static final String ESCOPO = "https://www.googleapis.com/auth/drive.file";
    private ActivityResultLauncher<IntentSenderRequest> lancador;
    private PluginCall pedido;

    @Override
    public void load() {
        lancador = getActivity().registerForActivityResult(new ActivityResultContracts.StartIntentSenderForResult(), r -> {
            PluginCall c = pedido;
            pedido = null;
            if (c == null) return;
            if (r.getResultCode() != Activity.RESULT_OK) { c.reject("Autorização cancelada", "cancelado"); return; }
            try {
                responder(c, Identity.getAuthorizationClient(getActivity()).getAuthorizationResultFromIntent(r.getData()));
            } catch (ApiException e) {
                c.reject("Falhou a autorização do Google", "erro-" + e.getStatusCode());
            }
        });
    }

    @PluginMethod
    public void autorizar(PluginCall call) {
        AuthorizationRequest req = AuthorizationRequest.builder().setRequestedScopes(Collections.singletonList(new Scope(ESCOPO))).build();
        Identity.getAuthorizationClient(getActivity()).authorize(req)
            .addOnSuccessListener(a -> {
                if (a.hasResolution() && a.getPendingIntent() != null) {
                    pedido = call;
                    try {
                        lancador.launch(new IntentSenderRequest.Builder(a.getPendingIntent().getIntentSender()).build());
                    } catch (Exception e) {
                        pedido = null;
                        call.reject("Não foi possível abrir o Google", "erro");
                    }
                } else responder(call, a);
            })
            .addOnFailureListener(e -> call.reject("Falhou a autorização do Google: " + e.getMessage(), "erro"));
    }

    private void responder(PluginCall c, AuthorizationResult a) {
        String t = a.getAccessToken();
        if (t == null || t.isEmpty()) c.reject("O Google não devolveu autorização", "erro");
        else c.resolve(new JSObject().put("token", t));
    }
}

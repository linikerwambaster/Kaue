<?php
// Configuração da GladePay. A chave fica no arquivo .env (fora do GitHub).

function env_carregar() {
    static $env = null;
    if ($env !== null) return $env;
    $env = [];
    $arquivo = dirname(__DIR__) . '/.env';
    if (is_readable($arquivo)) {
        foreach (file($arquivo, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $linha) {
            $linha = trim($linha);
            if ($linha === '' || $linha[0] === '#' || strpos($linha, '=') === false) continue;
            list($k, $v) = explode('=', $linha, 2);
            $env[trim($k)] = trim($v, " \t\"'");
        }
    }
    return $env;
}

function env_get($chave, $padrao = '') {
    $env = env_carregar();
    if (isset($env[$chave]) && $env[$chave] !== '') return $env[$chave];
    $v = getenv($chave);
    return ($v !== false && $v !== '') ? $v : $padrao;
}

function gladepay_request($metodo, $caminho, $corpo = null) {
    $key = env_get('GLADEPAY_API_KEY');
    if ($key === '') return [0, ['error' => 'Chave da GladePay não configurada.']];

    $url = rtrim(env_get('GLADEPAY_BASE_URL', 'https://app.gladepay.com.br/v1'), '/') . $caminho;
    $ch = curl_init($url);
    $headers = ['Authorization: Bearer ' . $key, 'Accept: application/json'];
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_CUSTOMREQUEST  => $metodo,
    ];
    if ($corpo !== null) {
        $headers[] = 'Content-Type: application/json';
        $opts[CURLOPT_POSTFIELDS] = json_encode($corpo, JSON_UNESCAPED_UNICODE);
    }
    $opts[CURLOPT_HTTPHEADER] = $headers;
    curl_setopt_array($ch, $opts);
    $resp = curl_exec($ch);
    $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $erro = curl_error($ch);
    curl_close($ch);

    if ($resp === false) return [0, ['error' => 'Falha de conexão: ' . $erro]];
    $json = json_decode($resp, true);
    return [$http, is_array($json) ? $json : ['error' => 'Resposta inválida da GladePay.']];
}

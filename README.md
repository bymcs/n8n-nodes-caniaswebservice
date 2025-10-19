# Canias WebService n8n Node

CANIAS IAS SOAP (Axis 1.4, rpc/encoded) servisine bağlanır. Dört operasyon sağlar:
- login
- listIASServices
- callIASService
- logout

Varsayılan WSDL:
http://your-canias-server:8080/CaniasWS-v1/services/iasWebService?wsdl

## Kurulum

1) Bağımlılıklar:
```bash
npm install
```

2) Derleme:
```bash
npm run build
```

3) n8n’e yükleme (seçenek 1: .tgz ile):
```bash
npm pack
```
n8n UI > Settings > Community Nodes > Install üzerinden oluşan .tgz dosyasını yükleyin.

Alternatif (seçenek 2: npm’e publish edip UI’dan paket adını girin):  
`@bymcs/n8n-nodes-caniaswebservice`

## Kullanım

- login:
  Gerekli alanları doldurun (client, language, dbName, dbServer, appServer, userName, password).
  Çıktı: `{ sessionId: "..." }`

- listIASServices:
  `Session ID` girin.
  Çıktı: `{ services: [...] }` - Kullanılabilir IAS hizmetlerinin listesi

- callIASService:
  `sessionid`, `serviceid`, `returntype`, `permanent` girin.
  Args Mode:
  - Raw String: `args` metnini olduğu gibi verin
  - JSON Object (stringified): JSON nesnesi verin, otomatik `JSON.stringify` yapılır
  Çıktı: `callIASServiceReturn` içeriği

- logout:
  `p_strSessionId` girin.
  Çıktı: `{ success: true }`

## Örnek akışlar

### Temel akış:
login -> callIASService -> logout

### Gelişmiş akış:
login -> listIASServices -> callIASService -> logout

- callIASService.sessionid alanına expression ile: `{{$json.sessionId}}`

## Notlar
- Axis 1.4 yanıtları genelde aşağıdaki alanlarla gelir:
  - login: `{ loginReturn: "SESSIONID" }`
  - callIASService: `{ callIASServiceReturn: ... }`
  Node bu alanları otomatik açar.
- Geliştirme/testte SSL doğrulama kapatma opsiyonu var; üretimde önerilmez.
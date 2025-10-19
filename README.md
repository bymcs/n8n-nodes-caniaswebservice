# CANIAS WebService n8n Node

CANIAS ERP Web Servisine bağlanır. Dört operasyon sağlar:
- login
- listIASServices
- callIASService
- logout

Varsayılan WSDL:
http://your-canias-server:8080/CaniasWS-v1/services/iasWebService?wsdl

## Kurulum

1. n8n arayüzünde **Settings > Community Nodes > Install** bölümüne gidin
2. Paket adını girin: `@bymcs/n8n-nodes-caniaswebservice`
3. **Install** butonuna tıklayın
4. n8n'i yeniden başlatın

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

### SOAP Entegrasyonu
- Bu node, CANIAS ERP'nin SOAP tabanlı IAS Web Servisi ile çalışır
- WSDL üzerinden servis metodlarına erişim sağlar
- SOAP 1.1 protokolü ile Axis 1.4 uyumlu yanıtlar döner

### Yanıt Formatı
- `login`: `{ loginReturn: "SESSIONID" }` şeklinde oturum kimliği döner
- `callIASService`: `{ callIASServiceReturn: ... }` şeklinde servis yanıtı döner
- Node, SOAP zarflarını otomatik olarak işler ve sonuç verisini açar

### Güvenlik
- Geliştirme/test ortamlarında SSL doğrulama kapatma seçeneği mevcuttur
- Üretim ortamlarında SSL doğrulamanın açık tutulması önerilir
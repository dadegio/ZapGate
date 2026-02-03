---
title: Progetto Giordano Davide BREVE
---

# Progetto Giordano Davide 

Questa tesi affronta il problema di abilitare **micropagamenti verificabili** (“zaps”) nell’ecosistema **Nostr**, mantenendo al contempo sovranità dell’utente e un’ottima **esperienza d’uso**. La soluzione proposta, **ZapGate**, integra **NIP‑57** (ZapRequest/ZapReceipt) con la famiglia **LNURL** (LUD‑06 e LUD‑16) e **BOLT11**; opzionalmente impiega **NIP‑26** per la delega di firma degli eventi e **NIP‑42** per l’autenticazione verso i relay. I contributi sono:
- (i) analisi dei NIP rilevanti e del flusso end‑to‑end 9734 → LNURL → BOLT11 → 9735;
- (ii) simulazioni su rete locale con Polar e wallet/servizi LNbits, comparando scenari **custodial** e **non‑custodial**;
- (iii) prototipo **ZapGate** che pubblica ricevute 9735 e supporta la discovery via LUD‑16;
- (iv) threat model e mitigazioni pratiche (finestra `created_at`, pin dei relay, validazione metadati LNURL).

I risultati indicano che il percorso **custodial** riduce il *time‑to‑first‑zap* e l’attrito di setup, ma introduce dipendenza da terzi e minore privacy; il percorso **non‑custodial** richiede gestione di canali/liquidità e più passaggi di configurazione, in cambio di maggiore controllo. **Limiti**: misurazioni in ambiente di test, campione di wallet limitato e analisi parziale della compatibilità client/relay. Il lavoro si chiude con linee guida per l’adozione e piste future (deleghe granulari, reputazione, bridging tra relay).

---

## Sezione 1. Tecnologia e architettura del protocollo

### 1.1 Critiche ai social centralizzati
Negli ultimi anni le principali piattaforme social sono state oggetto di crescenti critiche per via del loro modello di governance centralizzato. Aziende come Meta, X (ex Twitter) o TikTok detengono il controllo sull’accesso ai contenuti, sulle regole di moderazione, sulla visibilità dei post e sull’identità degli utenti. Questo approccio consente efficienza e scalabilità, ma solleva problemi rilevanti:

- **Censura arbitraria**: post o account possono essere rimossi o oscurati senza processo trasparente.
- **Proprietà dei dati**: gli utenti non possiedono realmente contenuti e identità digitale.
- **Lock‑in e sorveglianza**: i dati vengono monetizzati e profilati a fini pubblicitari, con impatto sulla privacy.
- **Dipendenza da singoli attori**: l’infrastruttura può essere manipolata da chi la gestisce, limitando la libertà di espressione.

Queste criticità sono evidenti tanto nell’attivismo politico e nel giornalismo indipendente quanto nella vita quotidiana di milioni di utenti. Il problema è tecnico, etico e sistemico.

### 1.2 Necessità di decentralizzazione
Per superare tali limiti, si sviluppano sistemi alternativi fondati su logiche **decentralizzate**. La decentralizzazione distribuisce il controllo, evitando punti singoli di fallimento o censura. In questo paradigma:
- ogni utente può autenticarsi e pubblicare contenuti senza dipendere da una piattaforma centrale;
- le informazioni sono distribuite tra nodi indipendenti, aumentando la resilienza;
- l’identità digitale diventa personale e portabile, non legata a un servizio specifico.

In questo scenario si inserisce **Nostr** (*Notes and Other Stuff Transmitted by Relays*), un **protocollo aperto** per una comunicazione libera, interoperabile e resistente alla censura: un’infrastruttura su cui costruire client, servizi, community e nuovi modelli economici, in alternativa ai social tradizionali.

### 1.3 Il protocollo Nostr

#### 1.3.1 Relay e client
Nostr non è un’applicazione, ma un **protocollo di comunicazione**. La rete si basa su **relay** (server indipendenti, di norma raggiunti via `wss://`) che ricevono, conservano e diffondono i messaggi senza modificarli. Ogni relay è gestito autonomamente e può stabilire regole di accesso e pubblicazione; non comunicando tra loro in modo obbligatorio e senza un ente che li controlli tutti, il sistema risulta **resistente a blocchi e manipolazioni**.

Il **client** è l’interfaccia con cui l’utente interagisce: configura le credenziali crittografiche, seleziona i relay, imposta i contatti e pubblica metadati (nome, biografia, immagine del profilo).

#### 1.3.2 Identità, chiavi, crittografia
Per autenticità e sicurezza, Nostr usa firme **Schnorr** sulla **curva ellittica `secp256k1`** (la stessa di Bitcoin). Alla creazione del profilo il client genera:
- **chiave privata**, per firmare i messaggi;
- **chiave pubblica**, identificatore univoco nella rete.

In questo modello non esistono i tradizionali *username*: **la chiave pubblica è l’identità**. Per ricevere messaggi l’utente condivide la propria chiave pubblica, spesso pubblicandola anche su altri canali. Non servono server centrali per gestire identità o login, poiché solo l’utente controlla le credenziali.

#### 1.3.3 Outbox/Inbox
I relay possono essere usati con ruoli logici distinti:
- **outbox**: pubblicazione dei messaggi dell’utente (post, commenti);
- **inbox**: ricezione di messaggi diretti o risposte.

La distinzione è logica: lo stesso relay può fungere da outbox e inbox. Un utente può pubblicare su un relay permissivo e ricevere da un relay più selettivo, migliorando resilienza, prestazioni e controllo.

#### 1.3.4 Struttura degli eventi (JSON) e interoperabilità
Ogni comunicazione avviene tramite **eventi JSON** con campi canonici:
- `id`: hash SHA‑256 dei campi canonici dell’evento;
- `pubkey`: chiave pubblica dell’autore;
- `created_at`: timestamp Unix di creazione;
- `kind`: numero che indica il tipo di evento, ad es.  
  `0` = metadati utente; `3` = lista seguiti; `10002` = configurazione relay;
- `tags`: lista di array con informazioni aggiuntive, tra cui
  - `e`: riferimento a un altro evento (id, url relay opzionale, pubkey autore);
  - `p`: riferimento a un utente (pubkey, relay opzionale);
  - `a`: riferimento a un evento indirizzabile/sostituibile;
- `content`: contenuto del messaggio;
- `sig`: firma digitale dell’evento.

#### 1.3.5 WebSocket, subscription e filtri
La comunicazione client‑relay avviene via **WebSocket** con scambio di messaggi JSON. Il client apre una connessione per relay e definisce **subscription** identificate da `subscription_id` (stringa ≤64 caratteri), accompagnate da **filtri** (autore, `kind`, intervalli temporali, tag, ecc.).

Messaggi dal **client** al relay:
- `["EVENT", <evento JSON>]`: invia un evento;
- `["REQ", <subscription_id>, <filters...>]`: richiede eventi che corrispondono ai filtri;
- `["CLOSE", <subscription_id>]`: chiude una subscription.

Messaggi dal **relay** al client:
- `["EVENT", <evento JSON>]`: trasmette gli eventi richiesti;
- `["OK", <event_id>, <true|false>, <message>]`: conferma o rifiuta un evento;
- `["EOSE", <subscription_id>]`: fine degli eventi memorizzati (*End Of Stored Events*);
- `["CLOSED", <subscription_id>, <message>]`: subscription chiusa;
- `["NOTICE", <message>]`: notifiche/avvisi.

**Autenticazione (NIP‑42).** Alcuni relay richiedono autenticazione per accedere a risorse specifiche. Il relay invia `["AUTH", <challenge-string>]` e il client risponde con un **evento di kind `22242`** firmato che include la *challenge* e l’URL del relay. Il relay verifica la firma e risponde con `OK` (o nega l’accesso).

---

## 2. Estensioni del protocollo (NIP)

### 2.1 NIP‑01 e altri
La struttura base è definita da **NIP‑01**: formato degli eventi, firma, connessione WebSocket e operazioni fondamentali client/relay. Per ampliare funzionalità (messaggi privati, reazioni, media, pagamenti) esistono numerosi altri NIP, pubblicati in modo aperto nel repository ufficiale; i client/relay possono implementarli in modo **modulare**.

### 2.2 Criteri di accettazione
Perché un nuovo NIP sia riconosciuto e documentato ufficialmente occorrono:
- **implementazioni multiple** (almeno due client e un relay);
- **opzionalità e retro‑compatibilità**;
- **originalità** (niente duplicazioni funzionali).

---

## 3. Lightning Network (LN)

### 3.1 Bitcoin e limiti on‑chain
Bitcoin registra ogni transazione in una blockchain pubblica e immutabile. La capacità ridotta (≈7 tps), le fee variabili e i tempi di conferma non sono ideali per pagamenti rapidi.

### 3.2 LN come soluzione *off‑chain*
**Lightning Network** è un *layer 2* che consente canali di pagamento bidirezionali *off‑chain*: le transazioni sono istantanee e a costo molto basso; solo apertura/chiusura canale sono on‑chain.

### 3.3 Canali, BOLT11, LNURL
I pagamenti su LN avvengono tramite **canali off‑chain** e sono identificati da **fatture BOLT11**, formato firmato che specifica importo, destinatario, scadenza e metadati.  
**LNURL** semplifica l’interazione tra wallet e servizi: permette, ad esempio, di inviare fondi a un’identità leggibile (`bob@ln.example.com`) senza generare manualmente una fattura. In Nostr l’indirizzo Lightning è pubblicato nei metadati del profilo (`kind:0`) nel campo `lud16`.

---

## 4. Zap: meccanismo di micropagamento

### 4.1 Cos’è uno zap
Uno **zap** è un micropagamento effettuato tramite LN, integrato in Nostr. Serve a supportare economicamente un autore (es. una mancia per un contenuto apprezzato) in modo istantaneo e senza piattaforme centralizzate. La combinazione **Nostr + LN** consente transazioni rapide e resistenti alla censura, incentivando la produzione di contenuti. Zap non è un wallet ma una **funzionalità** del protocollo (NIP‑57).

### 4.2 Attori coinvolti
| Ruolo          | Descrizione |
|----------------|-------------|
| `Alice (A)`    | Mittente dello zap. |
| `Bob (B)`      | Destinatario dello zap; può pubblicarne la ricevuta. |
| `Client`       | Applicazione (es. Damus) che genera eventi zap e interagisce con Nostr. |
| `Relay`        | Server che riceve e propaga eventi Nostr. |
| `LN Node`      | Nodo LN che gestisce il canale di pagamento. |
| `LNURL`        | Schema per interagire via URL con servizi/nodi LN; in Nostr l’indirizzo è esposto come `lud16` in `kind:0`. |

### 4.3 Sicurezza, autenticità, integrità
**Eventi principali di NIP‑57:**
- **`kind:9734` – ZapRequest**: contiene importo, eventuale commento, pubkey del destinatario, riferimenti all’evento zappato, elenco dei relay coinvolti e la firma di Alice. Non trasferisce denaro: è un’attestazione pubblica dell’intenzione di pagare.
- **`kind:9735` – ZapReceipt**: riferimento alla ZapRequest, firma di Bob e conferma pubblica e verificabile del pagamento.


**Implicazioni di pubblicità e possibili contromisure.**
La scelta di rendere pubblici sia la ZapRequest sia la ZapReceipt consente trasparenza e verificabilità universale, ma espone metadati sensibili come importi, frequenza e relazioni tra identità Nostr. In scenari delicati ciò può facilitare profilazione o mappatura delle interazioni. Per mitigare questi rischi si possono usare relay privati o ristretti, adottare identità pseudonime e minimizzare i metadati opzionali (es. commenti). In questo modo si conserva la robustezza crittografica del protocollo riducendo l’impatto sulla riservatezza.

**Proprietà garantite (ipotesi forti):** 
1. **Autenticità** – ogni evento (kind:9734 e kind:9735) è firmato digitalmente con la chiave privata dell’autore; la verifica con la corrispondente chiave pubblica assicura l’origine del messaggio. La chiave pubblica si trova nei metadati `kind:0` del profilo o può essere verificata tramite NIP-05 (pubkey ↔ dominio DNS). Rimane il problema di associarla a un’identità reale: soluzioni pratiche includono DNSSEC, firme PGP incrociate o reputazione costruita nel tempo.

::: success
Dove trovo la chiave pubblica e come la posso associare alla reale identita' di un agente. Problemi? Soluzioni? RISOLTA SOPRA
:::

2. **Integrità** – l’identificatore id, derivato da un hash dei campi canonici dell’evento, e la firma digitale impediscono qualsiasi modifica non autorizzata del contenuto dopo la firma.


3. **Non ripudio** – un mittente non può negare di aver pubblicato una ZapRequest da lui firmata, così come un destinatario non può negare la pubblicazione di una ZapReceipt, qualora questa sia presente nei relay.

4. **Verificabilità pubblica** – chiunque, interrogando i relay, può associare una ZapReceipt a una specifica ZapRequest e verificarne la correttezza crittografica. La ZapReceipt, infatti, contiene nei tag un riferimento diretto all’id della ZapRequest e alla pubkey del mittente, rendendo il legame crittograficamente verificabile.


5. **Resistenza alla censura** – la natura distribuita di Nostr permette la diffusione e la permanenza degli eventi perché gli utenti possono pubblicare su più relay contemporaneamente. Anche se un relay “selettivo” applica policy restrittive (per esempio accetta solo certi autori o tipi di eventi), gli altri relay continueranno a propagare gli stessi eventi, rendendo difficile la censura totale.

::: success
come ?
Cosa vuoi dire selettivi qui? RISOLTA SOPRA

:::

### 4.4 Analisi in condizioni forti
Assumendo le ipotesi forti che abbiamo analizzato e mostrato precedentemente, il meccanismo Zap realizza pienamente le proprietà di sicurezza descritte in §4.


La pubblicazione della ricevuta ha valore funzionale e non puramente informativo: consente a client, relay e terze parti di verificare pubblicamente l’avvenuto pagamento, di sbloccare contenuti condizionati e di alimentare metriche di reputazione interne all’ecosistema.

Questa trasparenza comporta implicazioni sul piano della riservatezza: l’analisi degli eventi pubblici può rivelare legami economici tra identità Nostr, frequenza e importo dei trasferimenti, nonché il contesto (post o evento) a cui si riferiscono. In scenari sensibili ciò può agevolare attività di profilazione o mappatura delle relazioni.

Sotto le ipotesi qui adottate, attacchi come spoofing di eventi, generazione di invoice fraudolente o compromissione di bot delegati non risultano praticabili: poiché ogni evento è firmato crittograficamente, ogni invoice è valida solo se emessa dal nodo Lightning legittimo e i bot possono operare solo entro i limiti della delega firmata (NIP-26).

Permangono invece limiti strutturali legati alla natura distribuita del sistema: 
- la possibilità che una ZapReceipt non venga pubblicata, 
- la perdita di correlazione tra richiesta e ricevuta su relay disgiunti
- l’esposizione pubblica dei metadati transazionali
- la dipendenza dalla cooperazione del destinatario per pubblicare la ricevuta — in caso contrario, la prova della transazione rimane confinata alla LN e non è collegabile in modo diretto e verificabile all’evento Nostr originario.

Queste caratteristiche costituiscono la base per la valutazione della sicurezza del protocollo Zap; nella sezione §6 verranno esaminati gli scenari in cui le ipotesi forti vengono meno, evidenziando vulnerabilità e possibili contromisure.

## 5. Simulazione tecnica

Per verificare nella pratica le proprietà teoriche, sono stati progettati due esperimenti complementari che rappresentano modelli opposti di gestione delle risorse:
- **scenario non‑custodial**, in cui ogni attore controlla chiavi e fondi;
- **scenario custodial**, in cui chiavi e infrastruttura LN sono delegate a un provider.

La doppia sperimentazione mette in luce i compromessi tra autonomia, semplicità, sicurezza e dipendenza da terze parti.

### 5.1 Scenario non‑custodial: Polar

#### 5.1.1 Ambiente
**Polar** è un framework open‑source per creare ambienti di test locali per LN, configurando più nodi Bitcoin e Lightning, wallet e connessioni. La topologia minima include:
- due nodi LND (Alice e Bob), ciascuno col proprio nodo Bitcoin;
- un nodo Bitcoin *miner* per generare blocchi e confermare transazioni;
- eventuali nodi aggiuntivi per simulare altri attori.

#### 5.1.2 Setup, funding, apertura canale
Obiettivo: eseguire uno zap nella forma più basilare (pagamento off‑chain tra Alice e Bob) con discovery via LNURL‑pay e pagamento BOLT11.

**Componenti:**
- Polar (ambiente Docker con UI);
- nodi LND: Alice, Bob;
- `bitcoind` + miner locale, in regtest, bitcoind crea la blockchain privata e il miner produce blocchi a comando. Questo consente di confermare immediatamente le transazioni on-chain necessarie (es. funding dei nodi LN o apertura dei canali) senza dover attendere tempi reali di rete;
- connessione P2P Alice↔Bob (i nodi Lightning non comunicano automaticamente; per poter aprire un canale occorre stabilire una connessione peer-to-peer);
- apertura canale LN e pagamento off‑chain.

>Nota: la simulazione con Polar riproduce solo la parte Lightning, perché non include relay Nostr né supporto per la pubblicazione automatica di eventi 9734/9735. Per una simulazione “completa” sarebbe necessario integrare manualmente uno script che, al termine del pagamento LN, generi e pubblichi la ZapRequest e la ZapReceipt su un relay Nostr locale. Questo passaggio non è incluso di default in Polar, ma può essere emulato collegando i due ambienti (LN ↔ Nostr) tramite API o tool esterni.


**Fase 1 – Reperimento informazioni di pagamento del destinatario**  
Il client di Alice recupera l’indirizzo Lightning (`lud16`) di Bob dai metadati `kind:0`:
```json
{
  "name": "Bob",
  "about": "Developer",
  "picture": "https://...",
  "lud16": "bob@ln.example.com"
}
```

Lo scambio mostrato sopra avviene su Nostr (REQ/EVT su kind:0) e serve solo a scoprire il campo lud16. Da lì parte il flusso LNURL-pay, che è separato dal protocollo Nostr: il wallet interroga l’endpoint remoto e ottiene la fattura BOLT11.
```
A → relay : REQ kind:0 pubkey:B
relay → A : EVENT kind:0 { metadata con lud16 / LNURL }
```



**Fase 2 – (solo schema) Creazione e pubblicazione della ZapRequest**  
Alice genera e firma un evento `kind:9734` (**ZapRequest**) e lo pubblica sui relay:
```json
{
  "kind": 9734,
  "pubkey": "pubkey_di_alice",
  "content": "Grazie per il tuo lavoro!",
  "tags": [
    ["p", "pubkey_di_bob"],
    ["e", "id_evento_originale"],
    ["relays", "wss://relay.nostr.example"],
    ["amount", 1000]
  ],
  "created_at": 1680000000,
  "sig": "firma_digitale"
}
```

**Fase 3 – Esecuzione del pagamento LN via LNURL**
- GET a `https://ln.example.com/.well-known/lnurlp/bob`  
  ← JSON con `minSendable`, `maxSendable`, `metadata`, `callback`
- chiamata del `callback` con importo (+ commento opzionale)  
  ← **fattura BOLT11**

**Simulazione in Polar (passi salienti)**
1. Generazione indirizzo on‑chain (Alice):
```
lncli newaddress p2wkh
```
2. Invio fondi *unconfirmed* da `bitcoind` e mining per la conferma:
```
bitcoin-cli sendtoaddress <indirizzo_alice> 1
bitcoin-cli generatetoaddress 6 $(bitcoin-cli getnewaddress)
```
3. Connessione P2P recuperando `identity_pubkey` e IP del nodo Bob:
```
# su Bob
lncli getinfo
hostname -I

# su Alice
lncli connect <pubkey_bob>@<ip_bob>:10009
```
4. Apertura canale LN da Alice verso Bob:
```
lncli openchannel --node_key=<pubkey_bob> --local_amt=500000 --push_amt=200000
```
5. Mining per confermare la transazione di funding:
```
bitcoin-cli generatetoaddress 6 $(bitcoin-cli getnewaddress)
```
6. Verifiche:
```
# Alice
lncli listchannels
# Bob
lncli channelbalance
```

**Fase 4 – Pubblicazione della ricevuta (schema)**  
Ricevuto il pagamento, Bob (o un bot) verifica la fattura e pubblica `kind:9735` (**ZapReceipt**):
```
LN Node (B) → bot di B : verifica ricezione invoice
B (bot)      → relay    : EVENT kind:9735 { ref: evento kind:9734, pubkey:B, sig:SigB }
```

**Simulazione del pagamento**  
Su LN, Bob crea una fattura da 1.000 sats:

```
lncli addinvoice --memo="Zap da Alice" --amt=1000
```
Alice paga la fattura usando il canale aperto:
```
lncli sendpayment --pay_req=<payment_request>
```
Output sintetico: pagamento **SUCCEEDED**, fee ≈ 0, preimage (è il segreto rivelato al termine di ogni pagamento LN; prova crittografica che l’invoice è stata saldata. Non viene pubblicato su Nostr, ma serve a garantire atomicità e sicurezza lato Lightning) restituito.
Dopo la conferma, Bob (o il suo bot) deve pubblicare su Nostr la ZapReceipt (9735): è questa l’attestazione visibile e verificabile che lega il pagamento LN alla ZapRequest originaria.


### 5.2 Scenario custodial: LNbits (demo) e Zeus Embedded LND

#### 5.2.1 Ambiente
Il nodo ricevente è ospitato dal servizio **LNbits** (demo server testnet), che gestisce canali e chiavi; il mittente usa **Zeus Wallet** in modalità **Embedded LND** su testnet.

#### 5.2.2 Setup, funding e pagamento
1. **LNbits**: creazione wallet (chiavi Admin/Invoice), verifica rete testnet, generazione fattura BOLT11 (1.000 sats).  
2. **Zeus**: installazione app, modalità Embedded LND, rete testnet.  
3. **Funding**: ottenimento fondi di test via faucet e conferma on‑chain.  
4. **Pagamento**: scansione del QR LNbits con Zeus, riepilogo (importo, memo, fee), conferma. Esito immediato “SUCCEEDED”, favorito da canali già aperti e liquidità del provider custodial.

### 5.3 Confronto sintetico

| Modello        | Controllo chiavi | Setup/complessità | Velocità esecuzione |
|----------------|------------------|-------------------|---------------------|
| **Custodial**  | Chiavi detenute dal provider. | Molto semplice: creazione wallet e generazione fattura quasi istantanee. | Molto alta: il provider ha già canali aperti e liquidità disponibile. |
| **Non-custodial** | Chiavi sotto esclusivo controllo dell’utente. | Più complesso: richiede avvio dei nodi, funding on-chain, apertura canali e configurazione client/relay. | Più lenta all’avvio, perché dipende dalla conferma on-chain del funding; una volta aperti i canali, i pagamenti off-chain sono rapidi e a bassa latenza. |


| Modello        | Dipendenza da terzi | Trasparenza/visibilità |
|----------------|---------------------|-------------------------|
| **Custodial**  | Elevata: il provider è punto di fiducia e possibile vulnerabilità. | Limitata a quanto esposto dal servizio. |
| **Non‑custodial** | Assente: nessun intermediario. | Massima: pieno accesso a log e dettagli. |

In sintesi, il modello non‑custodial garantisce autonomia e trasparenza a fronte di maggiore complessità; il custodial massimizza la semplicità sacrificando controllo e indipendenza. La scelta dipende da contesto d’uso, competenze e fiducia riposta in terzi.

![image](https://hackmd.io/_uploads/BymNhHEYgx.png)

### 5.4 Mini-valutazione quantitativa (metodologia + risultati)

**Protocollo di misura (n ≥ 10):**
1. Strumenta il client per loggare i timestamp `t0_click` (pressione bottone Zap) e `t1_receipt` (prima `EVENT 9735` reso nel DOM).
2. Per ogni run: genera 9734, esegui LNURL→BOLT11, paga, attendi 9735.
3. Calcola **TTFZ = t1_receipt − t0_click**. Registra anche **esito** (ok/ko), **fee** (sats), **relay path** (A,B, …), **wallet** e **importo**.
4. Su n misure valide: media, deviazione standard e **varianza** della latenza.


| Scenario | TTFZ medio (s) | Passi di setup (conteggio + elenco sintetico) | Success rate (%) | Fee stimate (sats) | Varianza latenza (s²) |
|---|---:|---|---:|---:|---:|
| **Non-custodial (Polar/LND)** | **TBD** | **5**: (1) funding regtest; (2) connessione nodi; (3) apertura canale; (4) deploy client/backend; (5) configurazione relay | **TBD** | **≈0–1** | **TBD** |
| **Custodial (LNbits + wallet)** | **TBD** | **3**: (1) creazione wallet LNbits; (2) wallet client (Zeus/Alby); (3) configurazione relay/client | **TBD** | **≈0–3** | **TBD** |


---


## 6. Analisi delle vulnerabilità

### 6.1 Attacchi possibili anche con ipotesi forti
1. **Relay disgiunti (visibilità incompleta)**: ZapRequest su relay-A e ZapReceipt su relay-B; nessun attore che interroga un singolo relay vede l’interazione completa → perdita di trasparenza/verificabilità.
In Nostr è prassi consultare più relay, ma se la Request e la Receipt non coesistono su almeno un relay comune, l’associazione resta inverificabile per chi non interroga entrambe le fonti.

2. **Rifiuto della ricevuta**: Bob riceve i fondi ma non pubblica `kind:9735` → la prova resta su LN e non è collegabile all’evento Nostr. Alice non può pubblicare la receipt al posto di Bob: la prova LN (preimage) dimostra il pagamento, ma non c’è legame crittografico diretto con la sua ZapRequest. Solo Bob, firmando con la sua chiave Nostr, può emettere una ZapReceipt valida.
3. **Flooding di ZapRequest**: invio massivo di `kind:9734` senza pagamento → spam, saturazione relay, peggior UX.

### 6.2 Attacchi che richiedono il venir meno delle ipotesi forti
- chiavi compromesse; client vulnerabili; nodo LN o dominio LNURL controllato dall’attaccante; comunicazione non sicura.

Esempi:
1. **Spoofing del campo `lud16`**: profilo con `lud16` falso che punta a endpoint LN dell’attaccante (typo‑squatting, account hijacking, bot che reindirizzano gli zap).
2. **Intercettazione LNURL (MITM)**: modifica della risposta LNURL (metadata o fattura) pur con fattura valida firmata da un nodo dell’attaccante (assenza di legame crittografico fra nodo LN e pubkey Nostr).
3. **Compromissione del client**: furto della chiave privata (client web che salvano su `localStorage`, estensioni compromesse, app senza PIN/biometria per la firma).
4. **Replay di ZapRequest**: ripubblicazione di `kind:9734` su altri relay (duplicazione/rumore); varianti con alterazioni minori e nuovi `id`. Questo è possibile perché la firma resta valida: l’evento è identico e non viene falsificato, ma solo duplicato. Non essendoci un marcatore univoco obbligatorio, il replay genera rumore senza però costituire una nuova richiesta genuina.
7. **Invoice spoofing**: server LNURL (callback) che emette fatture di un nodo terzo (provider compromesso o fake provider).
8. **MITM (Man in the middle) sul pagamento**: endpoint `http://` o proxy malevoli/captive portal che riscrivono `callback`, `invoice`, `metadata`. Il rischio concreto è durante la fase LNURL: se la comunicazione non è protetta da TLS, un attaccante in mezzo può sostituire l’URL di callback o la fattura restituendo una invoice generata da un proprio nodo. Con https:// e certificati validi l’attacco diventa impraticabile, poiché la manipolazione verrebbe rilevata dal client.
9. **Bot delegato compromesso**: delega incauta a bot con chiave troppo ampia, che può emettere ricevute false o abusare dell’identità.

### 6.3 Contromisure tecniche

#### 6.3.1 Reperimento dell’indirizzo LNURL
- **DNSSEC + TXT “nostr_pubkey”**: pubblicare un record firmato che leghi dominio e pubkey Nostr; il client confronta la pubkey del profilo con quella nel DNS e mostra warning in caso di mismatch.
- **Firma incrociata (PGP)**: includere nei metadati `kind:0` una firma PGP del campo `lud16`; il client verifica e mostra un badge “Verificato via PGP”.
- **Verifica reputazionale**: *trust‑score* locale su attività relay, storicità `lud16`, % di zap con ricevuta pubblicata, segnalazioni.

- **Rifiuto automatico di `http://`**: accettare solo endpoint LNURL `https://`.
- **Metadata hashing/consistenza semantica**: confrontare `metadata` restituito dall’LNURL con dati del profilo/contesto; avvisare su discrepanze.

#### 6.3.2 Emissione della ZapRequest (`kind:9734`)
- **Conferma esplicita di firma** per ogni zap (mostrare destinatario, importo, relay, messaggio).
- **Validità temporale ridotta di `created_at`** (es. ±5 minuti) per mitigare replay.
- **Tag univoco `["zap_id", <uuid>]`** per deduplicare a livello di client/relay.
- **Deduplicazione by `id` lato relay** e **aggregazione lato client** (una sola notifica per `id`/`zap_id`).

#### 6.3.3 Pagamento LN via LNURL
- **Verifica del dominio del `callback`**: deve corrispondere al dominio dichiarato in `lud16`.
- **HTTPS obbligatorio + verifica TLS** (hostname coerente con `lud16`).
- **(Proposta)** **firma del `metadata`** nella risposta LNURL e confronto con profilo Nostr.
- **DNSSEC** come legame dominio ↔ identità pubblica.

#### 6.3.4 Emissione della ZapReceipt (`kind:9735`)
- **Stato client “pending/confirmed”**: se entro 5–10 minuti non compare la ricevuta associata, mostrare *pending*; aggiornare a *confirmed* all’arrivo.
- **Policy relay favorevoli ai 9735**: promuovere/etichettare `9734` solo se compare `9735` associata entro un periodo.
- **Punteggi reputazionali**: % di zap con ricevuta, tempo medio di pubblicazione, coerenza dei relay.

- **Delega sicura (NIP‑26)**: il delegante firma una **condizione di delega** e il delegato include il **tag `delegation`** negli eventi che firma (es. ricevute 9735). Esempio semplificato di *tag* dentro l’evento del delegato:
```json
"tags": [
  ["delegation", "<pubkey_delegato>", "kind=9735&created_at<1700000000", "<firma_del_delegante>"]
]
```
Il delegato non possiede la chiave privata del delegante e può firmare solo gli eventi autorizzati.

#### 6.3.5 Visibilità tra relay
- **Inclusione esplicita dei relay** nei tag della ZapRequest (es. `["relays", ...]`) per indirizzare la ricerca della ricevuta.
- **Relay bridge/mirror** per replicare eventi zap su più nodi.
- **Notifica client** se la ZapReceipt è pubblicata su relay non indicati (suggerire interrogazione del relay alternativo).
- **Rate‑limit per pubkey** sui relay (es. max 5 ZapRequest/min).  
- **Filtri client**: mostrare per default gli zap con ricevuta associata; evidenziare separatamente quelli *pending*.

### Rischi chiave & mitigazioni
| Rischio                                | Effetto                                   | Mitigazione pratica |
|----------------------------------------|-------------------------------------------|---------------------|
| Relay disgiunti (9734 su A, 9735 su B) | Perdita correlazione/verificabilità        | Tag `["relays", …]`, bridge/mirror selettivi, ricerca mirata ricevute |
| Rifiuto della 9735                      | Pagamento non attestato su Nostr           | Stato *pending/confirmed*, policy relay pro-9735, punteggio reputazionale |
| Spoof `lud16` / MITM LNURL              | Fatture/metadata alterati                  | HTTPS obbligatorio, verifica dominio `callback`↔`lud16`, DNSSEC; warning su mismatch |
| Replay/flood di 9734                    | Rumore/spam                                | Finestra `created_at` ±5′, tag `["zap_id", <uuid>]`, dedup lato relay/client |
| Bot delegato compromesso                | Ricevute false/abusi                       | NIP-26 con scope stretto (kind=9735, scadenza, rate-limit); audit delle deleghe |


---

### 7. Considerazioni di sicurezza

Le minacce più rilevanti non derivano dalla crittografia o dalla struttura del protocollo, bensì da fattori esterni: uso improprio dei client, affidamento a metadati pubblici non verificati, eterogeneità e disconnessione tra relay, comportamenti malevoli o non cooperativi. Con buone pratiche di progetto, implementazioni attente e strumenti di reputazione/validazione incrociata, l’esperienza resta sicura e affidabile in un contesto decentralizzato. In queste condizioni, **Zap** può realizzare in modo robusto il modello di micropagamento decentralizzato su Nostr.


## Sezione 2: Applicazioni, Modelli di Business e ZapGate

### 1. Zap come abilitante per nuovi modelli economici
L’introduzione del meccanismo degli Zap all’interno dell’ecosistema Nostr rappresenta un passo significativo verso la creazione di economie digitali native, in grado di operare senza la dipendenza da intermediari centralizzati e con costi di transazione trascurabili. La loro forza non risiede soltanto nell’aspetto tecnico — ovvero l’utilizzo di micro-pagamenti via LN — ma soprattutto nella capacità di abilitare nuovi modelli di interazione economica che prima erano difficili o antieconomici da implementare.

#### Micro-pagamenti diretti
Nei modelli tradizionali, anche un pagamento di pochi centesimi comporta costi fissi sproporzionati (commissioni minime, costi di gateway, oneri di riconciliazione). Con Zap, il trasferimento di valore può avvenire in tempo reale per importi irrisori (anche frazioni di centesimo), senza costi aggiuntivi rilevanti.
Questo rende sostenibili scenari come:
- Ricompense istantanee per singoli contributi di valore (un post, un commento, una correzione);
- Pay-per-view di contenuti multimediali o articoli, senza imporre abbonamenti;
- Donazioni micro-frazionate distribuite tra più creatori in un’unica sessione di utilizzo;
- Incentivazione di azioni (es. completamento di un sondaggio, segnalazione di bug) con micropremi immediati.

#### Integrazione nei client
L’efficacia di Zap come strumento economico dipende dalla sua integrazione trasparente nei client Nostr. Un’implementazione ben progettata deve:
- Rilevare automaticamente la disponibilità di un indirizzo LNURL/lud16 nei metadati del profilo destinatario (evento kind:0), senza richiedere all’utente di copiarlo manualmente.
- Presentare un’interfaccia di pagamento coerente con il resto dell’esperienza utente, con importi predefiniti ma anche personalizzabili.
- Gestire la firma e la pubblicazione dell’evento kind:9734 in background, senza esporre dettagli tecnici all’utente medio.
- Interfacciarsi con wallet esterni o integrati, rispettando le preferenze dell’utente in termini di custodia dei fondi (custodial vs non-custodial).
- Ricevere e interpretare la ZapReceipt (kind:9735) come segnale di conferma, sbloccando eventuali contenuti o funzioni collegate.

Nei client più evoluti, questo flusso diventa quasi invisibile: l’utente “preme un bottone” e la transazione si completa in meno di un secondo, mantenendo però la tracciabilità e la verifica crittografica.

#### Rimozione di intermediari
Zap elimina la necessità di gateway di pagamento centralizzati, con relative commissioni e policy restrittive, di sistemi di accredito e prelievo legati a banche o carte di credito o di procedure di registrazione obbligatorie su piattaforme di terze parti.
Questo significa che chiunque — dal singolo creatore alla redazione giornalistica, dal piccolo marketplace alla community online — può ricevere pagamenti direttamente, senza vincoli geografici, autorizzazioni bancarie o accordi commerciali complessi.
La riduzione della complessità tecnica e burocratica apre la strada a micro-economie native del protocollo, che vivono e prosperano all’interno dell’ecosistema Nostr, senza “uscire” verso infrastrutture tradizionali se non per la conversione volontaria in valuta fiat.


Questi servizi, venduti in modalità pay-per-use o abbonamento, possono essere integrati direttamente nel client o forniti come plugin esterni.

### 2. ZapGate: applicazione concreta

#### Cos’è una “killer app”
Una *killer app* è un’applicazione talmente utile, semplice e immediata da diventare il principale fattore di adozione di una tecnologia.  
Nel contesto di Nostr e degli Zap, significa realizzare un’app che sfrutti appieno i micropagamenti decentralizzati, dimostrando in maniera chiara i vantaggi del protocollo sia per gli utenti sia per i creator.  
L’obiettivo è fornire un caso d’uso concreto e di forte impatto, capace di attrarre:  
- **utenti**, per la fruizione di contenuti e servizi;  
- **sviluppatori**, per estendere le funzionalità e creare integrazioni;  
- **stakeholder**, per investire e sostenere l’ecosistema.  

#### Perché ZapGate? Obiettivi e funzionalità
ZapGate nasce per offrire un sistema di monetizzazione diretto, trasparente e decentralizzato, sfruttando la resilienza del protocollo Nostr e la velocità della Lightning Network.  
Ogni contenuto viene pubblicato su Nostr e reso accessibile solo dopo l’invio di uno Zap verificato, eliminando intermediari e consentendo transazioni rapide a basso costo.

Le principali funzionalità previste sono:  
- Pubblicazione di contenuti su due livelli: **anteprima pubblica** e **contenuto protetto**.  
- Sblocco automatico del contenuto tramite **Zap** (micropagamento Lightning).  
- Integrazione con wallet **custodial** e **non-custodial**.  
- Possibilità di utilizzare **relay premium** per migliori performance, accesso autenticato e funzionalità extra.  

Sono previste due modalità di pagamento:  
- **Wallet esterno (non-custodial)**: il client apre un’app come Phoenix, Alby o Zeus e l’utente effettua manualmente il pagamento.  
- **Wallet integrato (custodial)**: se l’utente utilizza un wallet integrato (es. Alby via browser), il client può invocare l’API del wallet ed eseguire automaticamente il pagamento, solo se l’utente ha precedentemente concesso i permessi.  

È importante sottolineare che il client Nostr non gestisce mai direttamente i fondi: delega sempre l’operazione di pagamento al wallet Lightning selezionato, che può essere esterno o integrato.  

---

#### Sviluppo del prototipo
Il prototipo sviluppato ha l’obiettivo di dimostrare in maniera pratica come sia possibile integrare **Nostr** e la **Lightning Network** per la creazione di una piattaforma decentralizzata di pubblicazione, fruizione e monetizzazione dei contenuti digitali.  
L’applicazione implementa tutte le funzionalità chiave di un social network moderno (feed, profili, commenti, reazioni), arricchite dal meccanismo degli **Zap** ⚡, ovvero micropagamenti effettuati tramite Lightning e tracciati come eventi Nostr.

La scelta di costruire una **demo completa**, e non un semplice mockup, consente di osservare direttamente il comportamento reale dei relay, dei nodi Lightning e dei flussi di pagamento, fornendo una **proof-of-concept tangibile** del modello proposto.

---

#### Architettura generale
L’architettura segue un approccio **ibrido**, in cui convivono componenti decentralizzati e un backend minimale:

- **Frontend**: sviluppato in **Next.js** con **React** e **TailwindCSS**, fornisce l’interfaccia utente e gestisce la logica di pubblicazione, sottoscrizione e rendering degli eventi Nostr.  
- **Relay Nostr**: tre relay locali (Relay1, Relay2, Relay3) su cui vengono inviati e da cui vengono ricevuti gli eventi (`kind:0,1,7,30023,9734,9735,9736`).  
- **Nodi Lightning (LND)**: istanze configurate tramite `nodes-config.json`, ciascuna dotata di `host`, certificato TLS e macaroon per l’autenticazione. I nodi sono responsabili della creazione e del pagamento delle invoice.  
- **API backend**: implementate in Next.js (`/api/create-invoice`, `/api/pay-invoice`, `/api/nodes`). Funzionano da proxy sicuro verso LND, evitando di esporre direttamente macaroon e certificati al client.  
- **Storage locale**: utilizzo di `localStorage` e `sessionStorage` per mantenere dati lato utente, come storico degli Zap, eventi pubblicati e contenuti sbloccati. Non è presente alcun database centralizzato.  

---

#### Funzionalità principali

**Creazione e pubblicazione contenuti.**  
Gli utenti possono creare nuovi post (eventi `kind:30023`), associando metadati quali titolo, contenuto completo, anteprima e prezzo in satoshi.  
I post vengono firmati con la chiave dell’utente e pubblicati su più relay, rendendoli disponibili all’intera rete.  

**Sblocco tramite Zap.**  
Il cuore del prototipo è il meccanismo di sblocco dei contenuti tramite Zap:  
1. Il client richiede al backend la creazione di una invoice BOLT11 sul nodo del creatore.  
2. L’utente pagatore salda la invoice tramite il proprio nodo.  
3. Contestualmente vengono pubblicati su Nostr:  
   - un evento **ZapRequest (kind:9734)**;  
   - seguito da uno **ZapReceipt (kind:9735)** che certifica l’avvenuto pagamento.  
4. Il contenuto si sblocca nell’interfaccia e il pagamento viene registrato nello **storico transazioni**.  

Per garantire correttezza, la funzione `countActivePurchases` analizza gli eventi `9735` (ricevute) e `9736` (unsubscribe), calcolando in tempo reale gli acquisti effettivamente attivi.  

**Commenti e reazioni.**  
Ogni contenuto supporta:  
- Commenti (`kind:1`), memorizzati e ordinati cronologicamente.  
- Reazioni (`kind:7`), ad esempio ❤️ o 👍, visualizzate come contatori interattivi.  

Le reazioni vengono pubblicate come eventi e sincronizzate tra utenti, dimostrando la rapidità del protocollo.  

**Profili utente.**  
I profili sono gestiti come eventi `kind:0`, contenenti metadati quali nome, descrizione, immagine e indirizzo Lightning (`lud16`).  
L’utente può modificare il proprio profilo tramite estensioni NIP-07 (es. Alby, nos2x), che firmano l’evento e lo pubblicano su tutti i relay configurati.  

**Feed e navigazione.**  
Sono presenti diverse viste: feed globale, feed seguiti, trending, storico transazioni e ricerca utenti.  

---

#### Implementazione tecnica

- **Gestione eventi Nostr.** La libreria `lib/nostr.ts` fornisce funzioni per la creazione, firma e pubblicazione di eventi, oltre a generatori specifici (`createZapRequest`, `createZapReceipt`, `createCommentEvent`, `createReactionEvent`, `createDeleteEvent`, `createUnsubscribeEvent`).  
- **Integrazione Lightning.** La libreria `lib/zaps.ts` coordina l’intero processo: creazione della invoice, pubblicazione della ZapRequest, pagamento, pubblicazione della ZapReceipt e aggiornamento dei contatori di acquisti.  
- **Interfaccia utente.** Composta da componenti riutilizzabili (`ContentCard`, `CommentBox`, `ReactionButtons`, `ZapButton`, `ZapChart`), con navigazione gestita dal componente `Navbar` e supporto per dark mode.  

---

#### Sicurezza e configurazione
- **Macaroon e TLS:** accesso ai nodi LND tramite credenziali generate da Polar e protette da TLS.  
- **Backend proxy:** il client non accede mai direttamente al nodo Lightning, ma interagisce solo con le API Next.js.  
- **Chiavi utente:** firma degli eventi lato client tramite estensioni NIP-07, mantenendo le chiavi private sotto esclusivo controllo dell’utente.  
- **Variabili ambiente:** le informazioni sensibili (es. API key LNbits) sono esterne al codice e definite in `.env`.  
- **LocalStorage:** dati dell’utente (contenuti sbloccati, storico Zap) memorizzati solo localmente, riducendo i rischi di centralizzazione.  

---

#### Limitazioni del prototipo
- L’utilizzo di `NODE_TLS_REJECT_UNAUTHORIZED=0` in ambiente locale riduce la sicurezza e sarebbe da evitare in produzione.  
- L’assenza di un database centralizzato semplifica l’architettura, ma limita analisi globali e funzioni di moderazione.  
- La sincronizzazione dipende dalla disponibilità dei relay: se un relay è offline, la copertura dei contenuti si riduce.  
- La gestione dei micropagamenti è realistica, ma confinata in un ambiente di test (Polar + ngrok).  

---

#### Validità della demo come proof-of-concept
Il prototipo realizzato è una dimostrazione concreta e funzionale sia delle potenzialità di Nostr sia del meccanismo degli Zap.  

- **Lato Lightning:** mostra l’intero ciclo invoice → pagamento → ZapRequest/ZapReceipt → sblocco contenuto.  
- **Lato Nostr:** utilizza molteplici tipi di eventi standard, dimostrando la capacità del protocollo di gestire profili, contenuti, commenti, reazioni e pagamenti in un contesto decentralizzato.  

In questo modo, l’applicazione fornisce una prova convincente della possibilità di costruire un **ecosistema sociale e finanziario realmente distribuito**, in cui la pubblicazione e la monetizzazione dei contenuti avvengono senza intermediari, ma esclusivamente tramite relay Nostr e nodi Lightning.


### 3. Analisi economica del modello Zap nell’editoria digitale: il caso ZapGate

Il tema dei micropagamenti è da anni una promessa mai mantenuta dell’economia digitale.
Le tecnologie tradizionali, infatti, non permettono transazioni di importi molto piccoli in maniera sostenibile. I sistemi come PayPal, Stripe o le carte di credito applicano commissioni tipiche del 2,9% + 0,35 € a transazione.

Questo significa che, se un lettore volesse pagare un articolo online per pochi centesimi – ad esempio 0,05 € – la fee diventerebbe addirittura superiore all’importo stesso, pari a circa 0,35 €. In pratica, il micropagamento diventa antieconomico e non ha motivo di esistere.
Analogamente, i bonifici SEPA possono essere economici ma richiedono 1–2 giorni di tempo, rendendoli inadatti a flussi rapidi o granulari.

Con Lightning Network (LN) la situazione cambia completamente.
La fee media per una transazione è 1 satoshi (circa 0,00025 €): un importo talmente basso da essere quasi invisibile, anche per pagamenti da pochi centesimi. LN permette quindi quello che finora era impossibile: transazioni istantanee, globali e senza costi proibitivi, adatte non solo agli acquisti digitali tradizionali ma anche a flussi continui di micro-ricavi.

Esempio concreto:
- un pagamento da 0,50 € (≈ 2000 sats) → con carta/PayPal oltre il 50% va in commissioni;
- con Lightning, la fee resta nell’ordine di 1 sat, ossia praticamente zero.

#### Simulazione su larga scala

Per valutare in modo concreto la differenza tra i modelli, abbiamo simulato un milione di zap con distribuzione lognormale, che riproduce la dinamica reale: moltissimi micropagamenti da pochi sats e pochi zap più consistenti.

I risultati dicono che:
- con i sistemi tradizionali, le fee complessive superano i 350.000 € su 1 milione di transazioni;
- con Lightning, le fee della rete rimangono di poche centinaia di euro;
- persino aggiungendo un costo di servizio ai provider (relay, nodi o piattaforme), i costi restano due ordini di grandezza inferiori rispetto al modello tradizionale.

Un esempio concreto: applicando una commissione simbolica di 0,1% per transazione, le fee complessive non superano i 3.500 €. A confronto con i 350.000 € del sistema tradizionale, la differenza è evidente: Lightning non solo abilita i micropagamenti, ma li rende sostenibili su larga scala.

Questa evidenza numerica ci dice che Lightning non si limita a essere “più economico”: esso rende possibili modelli che semplicemente non potrebbero esistere nell’economia fiat.
Se oggi l’editoria online deve affidarsi a pubblicità invasiva o ad abbonamenti rigidi, il modello Zap abilita esperienze molto più elastiche:
- Pay-per-article: un lettore paga pochi sats solo per il singolo contenuto che desidera.
- Streaming money: nel caso della musica o dei podcast, si può immaginare un modello “a consumo”, ad esempio 1 sat al secondo di ascolto, senza più abbonamenti mensili.
- Machine-to-machine: anche i dispositivi connessi possono scambiare valore in tempo reale, come un’auto che paga automaticamente il pedaggio o una ricarica elettrica.

In tutti questi scenari, il costo di frizione deve essere vicino allo zero, altrimenti l’esperienza si rompe. LN fornisce esattamente questa proprietà.


![image](https://hackmd.io/_uploads/rJAi8emjlg.png)
*Figura 1 – Distribuzione degli importi degli zap simulati (scala logaritmica). La maggior parte delle transazioni ha importi molto bassi, mentre pochi zap hanno importi più elevati: questo rispecchia la realtà dei micropagamenti online.*
> I dati presentati non derivano da osservazioni dirette della rete Lightning, bensì da una simulazione Monte Carlo di un milione di zap. Gli importi sono stati generati secondo una distribuzione lognormale (parametri: mean = 4.5, σ = 0.8), scelta perché in grado di riprodurre un comportamento tipico dei micropagamenti, caratterizzato da numerosi trasferimenti di valore ridotto e da un numero limitato di importi più consistenti. Sono stati inoltre esclusi come outlier tutti i valori superiori a 100.000 sats.


#### Il ruolo del Provider
Rimane una domanda cruciale: se le fee sono così basse, come vengono pagati i provider della rete – relay, nodi e operatori dell’infrastruttura?

Qui entrano in gioco modelli alternativi:
- una flat fee minima (ad esempio 1 sat per zap, aggiunto al costo della rete),
- una commissione percentuale ridotta (0,1%), che rimane trascurabile per l’utente ma diventa significativa a grandi volumi.

La simulazione mostra che con un milione di transazioni, anche una commissione minima porta a ricavi concreti per i provider senza compromettere la convenienza per utenti e creator. In altre parole, LN permette di conciliare la sostenibilità economica dell’infrastruttura con un modello equo e scalabile.


#### Proiezioni e impatto
Immaginiamo un ecosistema con un milione di utenti attivi che inviano 10 zap al giorno da 100 sats.
Su base annua, questo significherebbe oltre 365 miliardi di sats in circolazione, pari a circa 90.000 BTC di volume.
In questo scenario, la rete LN genererebbe poche migliaia di euro di fee, mentre i sistemi tradizionali – semplicemente – collasserebbero: i costi fissi renderebbero impossibile gestire un flusso così frammentato.

La differenza non è solo quantitativa, ma qualitativa: Lightning apre a un’economia nativa di Internet, in cui i pagamenti possono essere granulari, frequenti, trasparenti e proporzionati al valore realmente consumato.

![image](https://hackmd.io/_uploads/rJHnNM5tlx.png) 
![image](https://hackmd.io/_uploads/H1J6EG5Fex.png)
*Figura 2/3 – Fee totali a confronto su 1 milione di zap: i metodi tradizionali (PayPal/Stripe) assorbono centinaia di migliaia di euro, mentre Lightning Network riduce i costi a poche centinaia. Anche aggiungendo fee ai provider (flat o percentuali), i costi restano due ordini di grandezza inferiori.*


#### Applicazione pratica: l'editoria digitale 
L’editoria digitale contemporanea è caratterizzata da una contraddizione evidente: da un lato i lettori cercano accesso rapido e gratuito alle notizie, dall’altro gli editori devono sostenere costi crescenti e garantire ricavi sufficienti a mantenere qualità e indipendenza.  
I modelli prevalenti – **abbonamenti mensili** e **pubblicità online** – presentano limiti strutturali: i primi vincolano gli utenti a costi fissi indipendenti dal consumo effettivo, i secondi generano ricavi incerti e spesso insufficienti, dipendenti da grandi piattaforme centralizzate.

Il modello **Zap**, basato su micropagamenti via Lightning Network (LN), rappresenta un’alternativa innovativa: permette di monetizzare singoli contenuti, con costi di transazione trascurabili e senza intermediari. Applicazioni come **ZapGate** rendono questi micropagamenti pratici e immediati, aprendo la strada a un modello editoriale più flessibile.



#### Modelli di monetizzazione
Nel contesto dell’editoria, il modello Zap può assumere forme diverse:

1. **Pay-per-article** – il lettore paga una piccola cifra (10–200 sats) per sbloccare un singolo contenuto.  
2. **Tip-based** – i contenuti restano gratuiti, ma gli utenti inviano Zap volontari come segno di supporto.  
3. **Modello ibrido** – articoli base gratuiti, mentre approfondimenti, report o podcast sono accessibili solo con Zap.

Il **ricavo mensile** per un editore può essere stimato tramite la formula:

```
R = U * Z * V 
```
dove:  
- **U** = numero utenti attivi,  
- **Z** = zap medi per utente al mese,  
- **V** = valore medio di un singolo zap (in sats).


#### Scenari concreti di applicazione
Per valutare la sostenibilità del modello Zap in editoria, consideriamo tre scenari progressivi.

##### Scenario A – Giornalista indipendente
- Utenti attivi: ~1.000  
- Zap medi/mese: 5  
- Valore medio: 50 sats (≈0,02 €)  
- **Ricavo stimato: ~100 €/mese**

In questo scenario il modello Zap non sostituisce un abbonamento, ma funge da **integrazione o forma di crowdfunding distribuito**, utile a coprire costi operativi o sostenere l’autore.

---

##### Scenario B – Piccola rivista online
- Utenti attivi: ~10.000  
- Zap medi/mese: 10  
- Valore medio: 100 sats (≈0,04 €)  
- **Ricavo stimato: ~4.000 €/mese**

Qui il modello Zap diventa competitivo con piccoli abbonamenti o modelli pubblicitari, con il vantaggio di coinvolgere anche i lettori occasionali.

---

##### Scenario C – Editore mainstream
- Utenti attivi: ~100.000  
- Zap medi/mese: 20  
- Valore medio: 200 sats (≈0,08 €)  
- **Ricavo stimato: ~160.000 €/mese**

In questo scenario il modello Zap potrebbe competere con i ricavi pubblicitari, garantendo un rapporto più diretto e trasparente tra lettore ed editore.

La tabella seguente sintetizza gli scenari di ricavo stimati in base a diverse scale di adozione.

*Tabella 1 – Stima dei ricavi in tre scenari applicativi di ZapGate.*

| Scenario                   | Utenti attivi | Zap medi/mese | Valore medio zap (sats) | Ricavo mensile (€) |
|----------------------------|---------------|---------------|--------------------------|--------------------|
| A – Giornalista indipendente | 1.000         | 5             | 50                       | ~100 €             |
| B – Piccola rivista online  | 10.000        | 10            | 100                      | ~4.000 €           |
| C – Editore mainstream      | 100.000       | 20            | 200                      | ~160.000 €         |

---

#### Analisi di abbonamento e complementarità con il modello Zap

Sebbene il modello Zap basato su micropagamenti via Lightning Network rappresenti una soluzione innovativa e flessibile, l’analisi economica non può trascurare la possibilità di integrare sistemi di **abbonamento**.  
Il motivo principale è la **prevedibilità dei ricavi**: un editore o un creator necessita di entrate stabili e pianificabili per coprire costi fissi (redazione, relay, hosting, produzione di contenuti). I micropagamenti, per loro natura, sono variabili e difficili da stimare a priori.  

In un ecosistema come Nostr, l’abbonamento non deve necessariamente replicare i modelli centralizzati (Stripe, PayPal), ma può essere implementato con logiche native:

- **Pagamenti ricorrenti via Lightning**: l’utente autorizza un pagamento periodico in sats (es. 5 € al mese), che viene trasferito direttamente al creator o al relay.  
- **ZapPool**: l’abbonamento si converte in un credito mensile di Zap, che il sistema redistribuisce automaticamente ai contenuti effettivamente consumati dall’utente.  
- **Relay premium**: l’accesso a relay privati ad alta affidabilità e bassa latenza può essere riservato agli abbonati, garantendo un’esperienza senza spam e con archiviazione estesa.  
- **Servizi aggiuntivi**: feed personalizzati, statistiche di utilizzo, notifiche prioritarie.

---

#### Perché un utente sceglierebbe l’abbonamento
Un abbonamento può risultare attraente per diverse categorie di utenti:

1. **Lettori intensivi** – chi legge quotidianamente rischia di spendere più con i micropagamenti: con l’abbonamento ottiene convenienza economica e zero frizione.  
2. **Chi cerca esclusività** – accesso a contenuti premium (report, podcast, community riservate).  
3. **Chi privilegia la comodità** – pagamento unico e automatico, senza dover pensare a ogni singolo Zap.  
4. **Chi vuole sostenere un progetto** – l’abbonamento funge anche da forma di supporto continuativo, simile al crowdfunding, ma nativo LN/Nostr.  

---

#### Complementarità tra Zap e abbonamenti
Il modello Zap e quello ad abbonamento non sono concorrenti, ma complementari:

- **Zap** → perfetti per utenti occasionali o per monetizzare singoli contenuti di valore.  
- **Abbonamenti** → ideali per utenti intensivi e per dare stabilità economica agli editori.  

L’editore può così proporre una **strategia ibrida**, lasciando libertà di scelta all’utente: chi legge poco paga meno (grazie agli Zap), chi legge molto trova più conveniente l’abbonamento.

![image](https://hackmd.io/_uploads/Sk5xSz5Flx.png)
*Figura 3 – Guadagno netto per i creator: LN preserva quasi intatto il valore inviato dagli utenti, a differenza dei sistemi tradizionali che erodono i micropagamenti con fee sproporzionate.*


### Distribuzione dei ricavi: applicazione della legge di Pareto
Come avviene in molte community digitali, una minoranza di utenti tende a generare la maggior parte delle entrate (legge di Pareto 80/20).

- **80% utenti casual**: 1 zap/settimana (≈200 sats/mese).  
- **20% utenti heavy**: 5 zap/giorno (≈7.500 sats/mese).  

In termini economici, i secondi sostengono gran parte dei ricavi.  
Ciò implica che ZapGate debba offrire una **user experience fluida** per incentivare contributi anche minimi, senza però trascurare strumenti di valorizzazione e fidelizzazione degli heavy user. 

*Tabella 3 – Distribuzione dei ricavi tra utenti casual e heavy.*

| Tipo utente   | % utenti | Zap/mese | Valore medio zap (sats) | Spesa mensile media (sats) | Ricavo totale mensile (€) |
|---------------|----------|----------|--------------------------|----------------------------|---------------------------|
| Casual        | 80%      | 4        | 50                       | 200                        | ~160 €                    |
| Heavy         | 20%      | 150      | 50                       | 7.500                      | ~1.200 €                  |
| **Totale**    | 100%     | -        | -                        | -                          | ~1.360 €                  |


![image](https://hackmd.io/_uploads/ByH4SfqFxg.png)
*Figura 4 – Percentuale fee rispetto al volume lordo: PayPal/Stripe arrivano facilmente al 10%, LN rimane sempre sotto l’1%.*

---

### Vantaggi economici del modello Zap
- Fee quasi nulle e transazioni istantanee.  
- Possibilità di monetizzare anche contenuti “minori” o occasionali.  
- Inclusività: anche importi simbolici diventano significativi se diffusi.  
- Trasparenza dei flussi economici, verificabili su Nostr e LN.  
- Elasticità: adattabile a giornalisti indipendenti e grandi editori.

---

### Criticità e limiti
- Ricavi poco prevedibili, assimilabili a donazioni volontarie.  
- Barriera tecnologica: necessità di wallet LN e conoscenza minima dell’ecosistema.  
- Cultura del “gratis” nell’informazione online, che può ridurre la propensione a pagare.  
- Mancanza di meccanismi consolidati di loyalty tipici degli abbonamenti.

*Tabella 4 – Confronto tra modelli di monetizzazione digitale.*

| Modello       | Stabilità ricavi | Barriera d’ingresso | Costi di intermediazione | Adatto a lettori occasionali | Trasparenza |
|---------------|------------------|---------------------|---------------------------|-------------------------------|-------------|
| Abbonamento   | Alta             | Alta (pagamento fisso) | Medio/Alto (Stripe, PayPal) | No                            | Media       |
| Pubblicità    | Media/Bassa      | Nulla               | Alto (piattaforme centralizzate) | Sì, ma intrusiva             | Bassa       |
| Zap           | Variabile        | Bassa               | Molto bassa               | Sì                            | Alta        |

---

### Prospettive future e roadmap
L’analisi mostra chiaramente che i micropagamenti nell’economia tradizionale sono impossibili a causa delle fee fisse, mentre con Lightning diventano sostenibili e scalabili.
Non si tratta solo di efficienza, ma di un cambio di paradigma: nuovi modelli di business (pay-per-article, streaming money, M2M) diventano praticabili, offrendo vantaggi sia agli utenti sia ai creator.

ZapGate si inserisce come esempio concreto di questo potenziale: un sistema che dimostra come i micropagamenti possano trasformare l’economia digitale, restituendo potere sia ai consumatori sia ai produttori di contenuti.

### Lavori correlati e confronto
I client Nostr esistenti integrano gli zap in modo eterogeneo (es. supporto a LNURL/LUD-16 e, talvolta, a NWC), mentre i flussi di pagamento classici LNURL-pay non preservano, da soli, la verificabilità pubblica su Nostr. **ZapGate** si differenzia per (i) una **pipeline esplicita 9734→LNURL→BOLT11→9735**, (ii) **metriche UX** e di affidabilità misurate, (iii) **policy di sicurezza** (pin dei relay, finestra `created_at`, TLS, deleghe NIP-26) e (iv) **replicabilità** (dataset e script). Il contributo non è un nuovo wallet o relay, ma un **collante dimostrativo** che massimizza **interoperabilità** e **verificabilità** end-to-end.


# Sezione 3. Considerazioni Finali

## Conclusioni

**(a) Cosa abbiamo dimostrato.** Con ZapGate abbiamo mostrato che l’integrazione tra **NIP-57 (9734/9735)** e la famiglia **LNURL (LUD-06/LUD-16)** consente micropagamenti verificabili in Nostr con un flusso end-to-end coerente: **9734 → LNURL → BOLT11 → 9735**. Il prototipo dimostra che la ricevuta 9735 può essere usata per **sbloccare contenuti**, alimentare **metriche di reputazione** e abilitare percorsi UX sia **custodial** sia **non-custodial**. Abbiamo inoltre esplicitato minacce e contromisure realistiche (selezione dei relay, deduplicazione, deleghe firmate, policy TLS), chiarendo come ottenere proprietà di **autenticità, integrità e verificabilità pubblica**.

**(b) Trade-off chiave: custodial vs non-custodial.** Il percorso **custodial** minimizza l’attrito (onboarding rapido, canali e liquidità “già pronte”), migliorando il *time-to-first-zap* e quindi l’esperienza iniziale. In cambio introduce **dipendenza da terze parti**, rischi di **sorveglianza/lock-in** e minor trasparenza. Il percorso **non-custodial** preserva **sovranità** e **privacy operativa**, ma richiede **setup e competenze** (nodi, canali, liquidity management) e tempi on-chain per l’avvio. La scelta è **situazionale**: in sperimentazione o per utenti alle prime armi è plausibile avviare da custodial per poi migrare; per creator e relay operator orientati alla resilienza è preferibile l’opzione non-custodial.

**(c) Limiti sperimentali.** Le misure finora sono raccolte in **ambienti di test** (regtest/testnet) con **campioni ridotti** di wallet e relay; non abbiamo una copertura esaustiva della compatibilità dei client né della distribuzione reale della latenza su Internet pubblica. Alcuni compromessi (es. `NODE_TLS_REJECT_UNAUTHORIZED=0` in locale) sono **accettabili solo per demo**, non per produzione. Questi limiti non inficiano la **validazione funzionale** del flusso ma vanno tenuti presenti per l’estrapolazione.

**(d) Tre piste future.**
1. **Deleghe granulari (NIP-26):** ricevute 9735 firmate da **bot delegati** con vincoli temporali e per-kind (*attenuazione del rischio chiave*; audit più semplice).
2. **NWC / NIP-47 (wallet-connect):** riduzione dell’attrito di pagamento e UX unificata tra client e wallet (anche mobile), mantenendo separazione dei privilegi.
3. **Bridging relay:** repliche selettive 9734/9735 tra relay con **policy di deduplicazione** per migliorare visibilità e ridurre i casi “richiesta su A, ricevuta su B”.

**Linee guida operative (da applicare subito):**
- **Pin dei relay** nei tag della `ZapRequest` e interrogazione mirata per la `ZapReceipt` (9735).
- **Validità corta di `created_at`** (±5 minuti) e tag di deduplica (`zap_id`) per mitigare spam/ripetizioni di 9734.
- **TLS obbligatorio** sugli endpoint LNURL; rifiuta `http://` e verifica coerenza dominio ↔ `lud16`.
- **Deleghe NIP-26** per i bot che pubblicano 9735, con **scope limitato** (`kind=9735`, scadenza, rate-limit).
- **Percorso ibrido**: onboarding *custodial* iniziale con migrazione assistita verso *non-custodial* (backup, export, bridge dei relay).


## Bibliografia

- **NIPs (standard Nostr)** — GitHub — https://github.com/nostr-protocol/nips — Raccolta ufficiale delle specifiche e stato.
- **NIP-01: Basic protocol flow** — GitHub — https://github.com/nostr-protocol/nips/blob/master/01.md — Struttura eventi e flusso base.
- **NIP-04: Encrypted Direct Message (storico)** — GitHub — https://github.com/nostr-protocol/nips/blob/master/04.md — DM legacy (se citati nel testo).
- **NIP-07: window.nostr (browser)** — nips.nostr.com — https://nips.nostr.com/7 — Firma eventi via estensioni.
- **NIP-11: Relay Information Document** — GitHub — https://github.com/nostr-protocol/nips/blob/master/11.md — Metadati e capability dei relay.
- **NIP-26: Delegated Event Signing** — GitHub — https://github.com/nostr-protocol/nips/blob/master/26.md — Delega sicura a bot/servizi.
- **NIP-47: Nostr Wallet Connect (NWC)** — nips.nostr.com — https://nips.nostr.com/47 — API di collegamento app↔wallet LN.
- **NIP-57: Lightning Zaps** — GitHub — https://github.com/nostr-protocol/nips/blob/master/57.md — Definisce 9734/9735.
- **BOLT #11: Invoice encoding** — GitHub — https://github.com/lightning/bolts/blob/master/11-payment-encoding.md — Formato fatture LN.
- **BOLTs (spec Lightning)** — GitHub — https://github.com/lightning/bolts — Raccolta ufficiale delle BOLT.
- **LNURL LUDs** — GitHub — https://github.com/lnurl/luds — Specifiche LNURL modulari.
- **LUD-06: payRequest** — GitHub — https://github.com/lnurl/luds/blob/luds/06.md — Endpoint per generare BOLT11 via callback.
- **LUD-16: Lightning Address** — GitHub — https://github.com/lnurl/luds — Alias email-like per i pagamenti.
- **Polar** — GitHub — https://github.com/jamaljsr/polar — Reti LN locali/regtest (GUI).
- **Bitcoin Core: regtest & RPC** — developer.bitcoin.org — https://developer.bitcoin.org/examples/testing.html — Script e comandi per test locali.
- **LND: lncli & API** — lightning.engineering — https://lightning.engineering/api-docs/api/lnd/ — Riferimenti ufficiali API/CLI.
- **CLN: lightningd & cli** — Core Lightning Docs — https://docs.corelightning.org/reference/lightning-cli — Alternativa LND.
- **LNbits** — Docs — https://docs.lnbits.org/ — Servizio custodial usato in demo (wallet e API).
- **Alby (estensione browser)** — Guides — https://guides.getalby.com/ — WebLN/NIP-07 e NWC.
- **@getalby/sdk** — npm — https://www.npmjs.com/package/@getalby/sdk — SDK per integrazione NWC.
- **Damus (client iOS/macOS)** — GitHub — https://github.com/damus-io/damus — Esempio di client con supporto zaps.
- **Zeus (wallet)** — Docs — https://docs.zeusln.app/for-users/using-zeus/wallets/ — Embedded LND e NWC.
- **Phoenix (wallet)** — Sito — https://phoenix.acinq.co/ — Wallet mobile non-custodial.
- **React** — react.dev — https://react.dev/ — Framework UI.
- **Next.js** — nextjs.org — https://nextjs.org/ — App router e API routes.
- **Tailwind CSS** — tailwindcss.com — https://tailwindcss.com/docs/installation — Utility-first CSS.


## Appendice A – Setup e Replicabilità

### A.1 Versioni consigliate
- **Polar**: 2.0.x
- **LND**: 0.17.x-beta (regtest)
- **Bitcoin Core**: 26.x (regtest)
- **Node.js**: 20.x LTS
- **Next.js**: 14.x
- **nostr-tools**: 1.17.x
- **@getalby/sdk**: ultima compatibile (NWC)

### A.2 `nodes-config.json` (esempio)
```json
{
  "nodes": [
    {
      "host": "https://127.0.0.1:8080",
      "tlsCertPath": "./certs/alice/tls.cert",
      "macaroonHex": "<MACAROON_ADMIN_HEX>",
      "nostr_pubkey": "<ALICE_PUBKEY>"
    },
    {
      "host": "https://127.0.0.1:8081",
      "tlsCertPath": "./certs/bob/tls.cert",
      "macaroonHex": "<MACAROON_INVOICE_HEX>",
      "nostr_pubkey": "<BOB_PUBKEY>"
    }
  ]
}
```

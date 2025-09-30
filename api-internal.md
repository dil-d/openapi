---
title: Sample API for GitBook Testing v1.0.0
language_tabs:
  - shell: Shell
  - http: HTTP
  - javascript: JavaScript
  - ruby: Ruby
  - python: Python
  - php: PHP
  - java: Java
  - go: Go
toc_footers: []
includes: []
search: true
highlight_theme: darkula
headingLevel: 2

---

<!-- Generator: Widdershins v4.0.1 -->

<h1 id="sample-api-for-gitbook-testing">Sample API for GitBook Testing v1.0.0</h1>

> Scroll down for code samples, example requests and responses. Select a language for code samples from the tabs above or the mobile navigation menu.

A simple API spec to test GitBook Git Sync, code snippet auto-generation, and profile-based filtering using tags or custom extensions.

Base URLs:

* <a href="https://api.example.com/v1">https://api.example.com/v1</a>

<h1 id="sample-api-for-gitbook-testing-orders">Orders</h1>

Endpoints related to order processing

## createOrder

<a id="opIdcreateOrder"></a>

> Code samples

{% tabs %}
{% tab title="shell" %}
```shell
# You can also use wget
curl -X POST https://api.example.com/v1/orders \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json'

```
{% endtab %}
{% tab title="http" %}
```http
POST https://api.example.com/v1/orders HTTP/1.1
Host: api.example.com
Content-Type: application/json
Accept: application/json

```
{% endtab %}
{% tab title="Node.js" %}
```javascript
const inputBody = '{
  "id": "o456",
  "productId": "abc123",
  "quantity": 29,
  "status": "pending"
}';
const headers = {
  'Content-Type':'application/json',
  'Accept':'application/json'
};

fetch('https://api.example.com/v1/orders',
{
  method: 'POST',
  body: inputBody,
  headers: headers
})
.then(function(res) {
    return res.json();
}).then(function(body) {
    console.log(body);
});

```
{% endtab %}
{% tab title="ruby" %}
```ruby
require 'rest-client'
require 'json'

headers = {
  'Content-Type' => 'application/json',
  'Accept' => 'application/json'
}

result = RestClient.post 'https://api.example.com/v1/orders',
  params: {
  }, headers: headers

p JSON.parse(result)

```
{% endtab %}
{% tab title="python" %}
```python
import requests
headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
}

r = requests.post('https://api.example.com/v1/orders', headers = headers)

print(r.json())

```
{% endtab %}
{% tab title="php" %}
```php
<?php

require 'vendor/autoload.php';

$headers = array(
    'Content-Type' => 'application/json',
    'Accept' => 'application/json',
);

$client = new \GuzzleHttp\Client();

// Define array of request body.
$request_body = array();

try {
    $response = $client->request('POST','https://api.example.com/v1/orders', array(
        'headers' => $headers,
        'json' => $request_body,
       )
    );
    print_r($response->getBody()->getContents());
 }
 catch (\GuzzleHttp\Exception\BadResponseException $e) {
    // handle exception or api errors.
    print_r($e->getMessage());
 }

 // ...

```
{% endtab %}
{% tab title="Java" %}
```java
URL obj = new URL("https://api.example.com/v1/orders");
HttpURLConnection con = (HttpURLConnection) obj.openConnection();
con.setRequestMethod("POST");
int responseCode = con.getResponseCode();
BufferedReader in = new BufferedReader(
    new InputStreamReader(con.getInputStream()));
String inputLine;
StringBuffer response = new StringBuffer();
while ((inputLine = in.readLine()) != null) {
    response.append(inputLine);
}
in.close();
System.out.println(response.toString());

```
{% endtab %}
{% tab title="go" %}
```go
package main

import (
       "bytes"
       "net/http"
)

func main() {

    headers := map[string][]string{
        "Content-Type": []string{"application/json"},
        "Accept": []string{"application/json"},
    }

    data := bytes.NewBuffer([]byte{jsonReq})
    req, err := http.NewRequest("POST", "https://api.example.com/v1/orders", data)
    req.Header = headers

    client := &http.Client{}
    resp, err := client.Do(req)
    // ...
}

```
{% endtab %}
{% endtabs %}

`POST /orders`

*Create order*

Create a new order for a user

> Body parameter

```json
{
  "id": "o456",
  "productId": "abc123",
  "quantity": 29,
  "status": "pending"
}
```

<h3 id="createorder-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|[Order](#schemaorder)|true|none|

> Example responses

> 201 Response

```json
{
  "id": "o456",
  "productId": "abc123",
  "quantity": 29,
  "status": "pending"
}
```

<h3 id="createorder-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|Order created successfully|[Order](#schemaorder)|

<aside class="success">
This operation does not require authentication
</aside>

# Schemas

<h2 id="tocS_User">User</h2>
<!-- backwards compatibility -->
<a id="schemauser"></a>
<a id="schema_User"></a>
<a id="tocSuser"></a>
<a id="tocsuser"></a>

```json
{
  "id": "u123",
  "email": "user@example.com"
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|id|string|false|none|none|
|email|string(email)|false|none|none|

<h2 id="tocS_Order">Order</h2>
<!-- backwards compatibility -->
<a id="schemaorder"></a>
<a id="schema_Order"></a>
<a id="tocSorder"></a>
<a id="tocsorder"></a>

```json
{
  "id": "o456",
  "productId": "abc123",
  "quantity": 29,
  "status": "pending"
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|id|string|false|none|none|
|productId|string|false|none|none|
|quantity|integer|false|none|none|
|status|string|false|none|none|

#### Enumerated Values

|Property|Value|
|---|---|
|status|pending|
|status|confirmed|
|status|shipped|


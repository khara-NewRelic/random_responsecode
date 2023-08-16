# はじめに:
このドキュメントは、ubuntuサーバにNGINXとNode.jsを導入し、本レポジトリのindex.jsを適用する手順を簡単にまとめたものです。Linuxでのコマンドを触ったことがある人を想定していますが・・・が、大したことは記載していないです。

---
# 環境のゆるい前提:
 - 既にubuntuサーバを確保してる
 - ubuntuサーバに固定のパブリックなIPアドレスが割り振られている
 - ubuntuサーバのFQDNをDNSで解決できること
(メモ: AWSならEC2、Elastic IP、Route53を用いて・・・)

---
# 作業手順
## Nginx on Ubuntuの導入
参考サイトは[こちら](https://ubuntu.com/tutorials/install-and-configure-nginx#2-installing-nginx)
```
sudo apt update
sudo apt install nginx
```

補足) 動作確認として
`curl http://localhost`
を実行し、コンテンツが返ってくるかを確認すると良い

## NGINXをhttps(Let’s Encrypt with certbot)
参考サイトは[こちら](https://certbot.eff.org/)
### install snapd
```
sudo apt update
sudo apt install snapd
```
### Remove certbot-auto
```
sudo apt-get remove certbot
```
### Install Certbot
```
sudo snap install --classic certbot
```
### Set up the Certbot command
```
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```
### Get cert and update nginx configuration
```
sudo certbot --nginx
```

途中でドメイン名を聞かれる。これはFQDNを回答すれば良い
### [Test] test automatic renewal
```
sudo certbot renew --dry-run
```

## Node.js on Ubutn (複数の方法のうち、簡単な方法で)
参考情報は[こちら](https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-ubuntu-20-04)

```
sudo apt update
sudo apt install nodejs
sudo apt install npm
```

## サンプルのNode.jsコードの取得
コードの展開先を/node/srcと仮置きしています。

```
sudo mkdir -p /nodejs/src
cd /nodejs/src
sudo git clone https://github.com/khara-NewRelic/random_responsecode.git
cd random_responsecode
sudo nohup node index.js &
```

補足) `curl http://localhost:3000`
を複数回実行し、さまざまなステータスのコンテンツが返ってくるかを確認すると良い

## NGINXからNodejsへルートする設定を追加する
参考情報は[こちら](https://blog.logrocket.com/how-to-run-a-node-js-server-with-nginx/)

```
cd /etc/nginx/sites-available
sudo vi default
```

**Before:** https用のserverディレクティブ内に以下の記載があるので、
```
location / {
        # First attempt to serve request as file, then
        # as directory, then fall back to displaying a 404.
        try_files $uri $uri/ =404;
    }
```

**After:** 以下の内容にアップデートする
```
error_page 404 /404.html;
        location = /404.html {
                root /var/www/html;
        }
	location = / {
		# First attempt to serve request as file, then
		# as directory, then fall back to displaying a 404.
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header Host $host;
                proxy_pass http://127.0.0.1:3000;
	}
```

404.htmlは[こちら](https://github.com/khara-NewRelic/funny_error_page_404/blob/main/404.html)を参考に、`/var/www/html/404.html`を作成すること。
### NGINXでの設定ファイルの確認
```
sudo nginx -t
```
### NGINXの再起動
```
sudo systemctl restart nginx
```

---
# 補足: Node APM Agentの導入
New Relicポータルにて表示されるコマンド(on host)に従って作業を行うことを前提とする。
### Node.jsの最新バージョンにアップデートする
古いNode.jsを利用している場合、newrelic.jsを含めたアプリケーションの起動時に`promise`が含まれていないとう旨のエラーメッセージが出る
その様な場合、以下を実行し、最新版のNode.jsを適用すると良い
```
sudo npm install -g
sudo n latest
```

### newrelic.jsの導入
アプリケーションが配置されているパスを`/src`と仮定しています。(/srcが対象Nodeアプリのルートと想定しています。)
```
cd /src
sudo npm install newrelic --save
sudo cp ./node_modules/newrelic/newrelic.js
sudo vi newrelic.js
```
newrelic.js内に'app_name'と'license_key'の変数が記載されているため、値を適切なものに更新する
補足1) 'license_key'は、INGEST_LICENSEキーの値を設定すること
補足2) New RelicポータルのAdd Dataの画面に従って作業を進めると、更新する具体的な値が表示されています

上記の設定ファイルを保存し、nodeに'-r newrelic'オプションを追加して、アプリケーションを起動します。
**起動例**
```
sudo nohup node -r newrelic index.js &
```
# go-scaffold



## How to start project

#### 1. Install dependencies
```sh
cp dev/bruno/.env.example dev/bruno/.env
docker compose up -d
docker compose logs -f app
```

## Access bash
```sh
docker compose exec app bash
```

## How to run tests and linters
> all commands must be run inside docker container except `make lint`

#### 1. Generate mocks, docs and other dependencies with
```sh
make generate
```

#### 2. Run test
```sh
make test
```

#### 3. Run lint
> must be run outside of docker container
```sh
make lint
```

#### 4. Name you project
- change all `"github.com/braiphub/go-scaffold"` to `"your-project-name"` in all files

## How to simulate app flows

### 1. receiving a book-created event and storing it on database

#### 1.1. Put `contracts/in/ms-books.book_created.json` into `ms-scaffold.books.created` queue
#### 1.2. Watch output into database. There must have a book item and chapter item
#### 1.3. Watch output into monitoring queue `ms-scaffold.*`. There must have a chapter-created message

### 2. creating an extra chapter through HTTP API

#### 2.1. Open /dev/bruno into bruno rest client
#### 2.2. Send post command (`Chapters/Create`)
#### 2.3. Watch output into database. There must have another chapter item
#### 2.4. Watch output into monitoring queue `ms-scaffold.*`. There must have a chapter-created message

## Debug

### Golang IDE
1 - Crie uma configuração de depuração do tipo "Go Remote" no seu IDE.

2 - Use as seguintes configurações:
    - Host: `localhost`
    - Port: `40000`

3 - Mude seu arquivo `.env` para incluir a variável `DEBUG=true`

4 - Inicie o contêiner Docker com o comando `docker compose up -d`
6 - Inicie a depuração no seu IDE.

### Vscode
1 - crie a seguinte configuração no seu arquivo `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug (Docker)",
      "type": "go",
      "request": "attach",
      "mode": "remote",
      "debugAdapter": "dlv-dap",
      "host": "127.0.0.1",
      "port": 40000,
      "showLog": true,
      "trace": "verbose",
      "substitutePath": [
        {
          "from": "${workspaceFolder}",
          "to": "/app"
        }
      ],
      "cwd": "${workspaceFolder}"
    }
  ]
}
```
2 - Mude seu arquivo `.env` para incluir a variável `DEBUG=true`

3 - Inicie o contêiner Docker com o comando `docker compose up -d`
4 - Inicie a depuração no seu IDE.

> Para parar o debug mude a variavel para `false` 

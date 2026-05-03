#!/bin/bash

REPO="https://github.com/b10189ahmedali-pixel/HITLOSA.git"
FOLDER="HITLOSA"

clear

install_base() {
  if command -v apt >/dev/null 2>&1; then
    apt update -y >/dev/null 2>&1
    apt install -y git curl >/dev/null 2>&1
  fi

  if ! command -v node >/dev/null 2>&1; then
    echo "Node.js required in CodeSandbox template."
    exit 1
  fi
}

run_app() {
  cd "$FOLDER" || exit
  npm install

  # remove old process if any
  pkill -f vite >/dev/null 2>&1
  pkill -f react-scripts >/dev/null 2>&1
  pkill -f next >/dev/null 2>&1

  # Vite
  if grep -q "\"dev\":.*vite" package.json; then
    echo "Starting Vite on 0.0.0.0:8080"
    npm run dev -- --host 0.0.0.0 --port 8080

  # Create React App
  elif grep -q "react-scripts" package.json; then
    echo "Starting CRA on 0.0.0.0:8080"
    HOST=0.0.0.0 PORT=8080 npm start

  # Next.js
  elif grep -q "\"dev\":.*next dev" package.json; then
    echo "Starting Next.js on 0.0.0.0:8080"
    npx next dev -H 0.0.0.0 -p 8080

  # Generic
  else
    echo "Trying npm start on 0.0.0.0:8080"
    HOST=0.0.0.0 PORT=8080 npm start
  fi
}

install_files() {
  install_base

  if [ -d "$FOLDER" ]; then
    cd "$FOLDER" && git pull && cd ..
  else
    git clone "$REPO"
  fi

  run_app
}

admin_setup() {
  cd "$FOLDER" || exit
  read -p "Username: " u
  read -p "Password: " p
  read -p "Email: " e

cat > admin.json <<EOF
{
 "username":"$u",
 "password":"$p",
 "email":"$e"
}
EOF

 echo "Admin saved."
}

node_setup() {
  cd "$FOLDER" || exit
  read -p "Node Token: " t
  read -p "Panel Link: " l

cat > nodes.json <<EOF
{
 "token":"$t",
 "panel":"$l"
}
EOF

 echo "Node saved."
}

while true
do
clear
echo "==== HITLOSA MENU ===="
echo "1) Install Files + Start Port 8080"
echo "2) Admin Setup"
echo "3) Node Setup"
echo "4) Exit"
read -p "Select: " c

case $c in
1) install_files ;;
2) admin_setup ;;
3) node_setup ;;
4) exit ;;
esac

read -p "Press enter..."
done

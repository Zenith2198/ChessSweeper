# ChessSweeper

Server code located at [ChessSweeperServer](https://github.com/emori1248/ChessSweeperServer).

To run this locally, it has to be hosted on a webserver. I recommend [NGINX](https://nginx.org/en/download.html).

Steps:

1. Install NGINX. On Windows, navigate to their website and unzip the folder into any location you want (`$INSTALL_LOCATION$`). On Ubuntu, run `sudo apt install nginx`.
2. Place the contents of the repo in correct location. On Windows, this is `$INSTALL_LOCATION$\html`. On Ubuntu, this is `/var/www/html`. Make sure index.html is at this level, not the containing folder. Remove any files in this location before moving them into the folder.
3. Start NGINX. On Windows, open a command prompt, type `cd $INSTALL_LOCATION$` and then `nginx.exe`. On Ubuntu, run `sudo systemctl start nginx`.
4. Open a web browser and navigate to `localhost`.

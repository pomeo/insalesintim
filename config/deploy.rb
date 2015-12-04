#========================
#CONFIG
#========================
set :application, "test2.sovechkin.com"
#========================
#CONFIG
#========================
require           "capistrano-offroad"
offroad_modules   "defaults", "supervisord"
set :repository,  "git@github.com:pomeo/insalesintim.git"
set :supervisord_start_group, "app"
set :supervisord_stop_group,  "app"
#========================
#ROLES
#========================
set  :gateway,    "#{application}" # main server
role :app,        "10.3.253.2"     # container

after "deploy:create_symlink",
      "deploy:npm_install",
      "deploy:cleanup",
      "deploy:restart"

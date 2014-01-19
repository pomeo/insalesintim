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
set :supervisord_start_group, "test"
set :supervisord_stop_group, "test"
#========================
#ROLES
#========================
set  :gateway,    "#{application}"   # main server
role :app,        "ubuntu@10.3.42.2" # lxc container
 
after "deploy:create_symlink", "deploy:npm_install", "deploy:restart"

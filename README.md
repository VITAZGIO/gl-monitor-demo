#               Шпоры команд
#    Обновить код  репозитория проекта github с кода на компе
# Попасть в папку проекта
cd gl-monitor-demo                           #Пк работа
cd C:\Users\vitaz\programs\gl-monitor-demo   #Ноут
# Выполнить для обновления репозитория github с кода на пк
git add .; git commit -m "Что изменил"; git push

#    Обновить код на компе с репозитория проекта github
# Попасть в папку проекта
cd gl-monitor-demo                           #Пк работа
cd C:\Users\vitaz\programs\gl-monitor-demo   #Ноут
# Выполнить для обновления кода на пк с репозитория github
git pull


#    Ссылка на сайт докера
http://192.168.3.77:8000      # Локалка
http://100.104.111.39:8000    # Netbird

#    Обновить контейнер после редактирования и сохранения файлов
docker compose up -d --build
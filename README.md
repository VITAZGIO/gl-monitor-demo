#    Обновить контейнер после редактирования и сохранения файлов
docker compose up -d --build

#    Изменил код код проекта github
# В папке проекта
cd gl-monitor-demo
# Выполнить для обновления репозитория github
git add .
git commit -m "что изменил"
git push

#    Обновить код на компе с репозитория github
# В папке проекта
cd gl-monitor-demo
# Выполнить для обновления кода на пк с репозитория github
git pull
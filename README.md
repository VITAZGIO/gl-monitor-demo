#Обновить контейнер после редактирования и сохранения файлов
docker compose up -d --build

# изменил код github
git add .
git commit -m "что изменил"
git push

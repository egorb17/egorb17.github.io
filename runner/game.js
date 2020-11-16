var context                             // canvas
var gameIsRunning = false               // игра работает?
var hero                                // главный персонаж
var surfacePosition = 400               // позиция поверхости
var timer                               // таймер для контроля времени
var enemyCreationTime                   // время появления врага
var enemyCreationPosition = 1100        // позиция появления врагов
var enemyDestructionPosition = -100     // позиция исчезновения врагов
var score                               // счёт игры
var maxScore = 0                        // максимальный счёт
var backgroundImage                     // задний фон
var surfaceSpeed = 5                    // скорость врагов на поверхности (кактусы)
var airplaneSpeed = 3                   // скорость самолётов
var gameSpeed                           // скорость игры
var saveGameSpeed                       // сохранение скорости игры (при замедлении времени)
var isSlowTime                          // время замедлено
var gravitation = 0.8                   // гравитация (участвует в расчёте прыжка игрока)
var bonus                               // бонус

var jumpAudio = new Audio('jump.mp3')
var deadAudio = new Audio('dead.mp3')

// Класс сущности
class Entity {
    x
    y
    sizeX
    sizeY
    visible
    image

    constructor(x, y, sizeX, sizeY, visible, imageId) {
        this.x = x
        this.y = y
        this.sizeX = sizeX
        this.sizeY = sizeY
        this.visible = visible
        this.image = document.getElementById(imageId)

        // Если сущность видима - отображаем её
        if (visible == true) {
            this.Show()
        }
    }

    // Пересекаются ли две сущности?
    static CheckCollision(e1, e2) {
        if ((((e1.x >= e2.x && e1.x <= e2.x + e2.sizeX) || (e1.x + e1.sizeX >= e2.x && e1.x + e1.sizeX <= e2.x + e2.sizeX))
            && ((e1.y >= e2.y && e1.y <= e2.y + e2.sizeY) || (e1.y + e1.sizeY >= e2.y && e1.y + e1.sizeY <= e2.y + e2.sizeY)))
            || 
            (((e2.x >= e1.x && e2.x <= e1.x + e1.sizeX) || (e2.x + e2.sizeX >= e1.x && e2.x + e2.sizeX <= e1.x + e1.sizeX))
            && ((e2.y >= e1.y && e2.y <= e1.y + e1.sizeY) || (e2.y + e2.sizeY >= e1.y && e2.y + e2.sizeY <= e1.y + e1.sizeY)))) {
            return true
        }
        else {
            return false
        }
    }

    Show() {
        this.visible = true
        context.drawImage(this.image, this.x, this.y)
    }

    Hide() {
        this.visible = false
        context.clearRect(this.x, this.y, this.sizeX, this.sizeY)
    }

    Move(x, y) {
        this.x = x
        this.y = y
    }

    MoveRel(dx, dy) {
        this.x += dx
        this.y += dy
    }

    ReloadImage(newImageId) {
        delete this.image
        this.image = document.getElementById(newImageId)
    }
}

// Класс игрока
class Hero extends Entity {
    isJumping                   // В прыжке ли находится игрок
    jumpAcceleration            // Ускорение прыжка
    doubleJump                  // Возможность прыгнуть второй раз
    addImage                    // Дополнительное ихображение для анимации
    invulnerableTime            // Время неуязвимости
    slowTime                    // Время замедления

    constructor(x, y, sizeX, sizeY, visible, imageId, addImageId) {
        super(x, y, sizeX, sizeY, false, imageId)

        this.isJumping = false
        this.jumpAcceleration = 0
        this.doubleJump = true
        this.addImage = document.getElementById(addImageId)
        this.invulnerableTime = 0
        this.slowTime = 0

        if (visible == true) {
            this.Show()
        }
    }
    
    // Показывает первое или второе изображение в зависимости от переменной frame
    Show() {
        this.visible = true

        // Смена кадров движения ног
        let timeModule = timer % 10
        if (timeModule >= 5 || this.isJumping == true) {
            context.drawImage(this.image, this.x, this.y)
        }
        else {
            context.drawImage(this.addImage, this.x, this.y)
        }
        
        // Отрисовка иконки при бонусе
        if (this.invulnerableTime > 0) {
            context.fillStyle = "blue"
            context.fillRect(this.x + (this.sizeX / 2) - 5 - 10, this.y - 15 - parseInt(this.invulnerableTime / 50), 10, parseInt(this.invulnerableTime / 50))
            context.fillStyle = "black"
        } 
		
        if (this.slowTime > 0) {
            context.fillStyle = "seagreen"
            context.fillRect(this.x + (this.sizeX / 2) - 5 + 10, this.y - 15 - parseInt(this.slowTime / 50), 10, parseInt(this.slowTime / 50))
            context.fillStyle = "black"
        }
    }
    
    // Проверка возможности прыгнуть
    TryJump() {
        if (this.isJumping == false) {
            this.isJumping = true
            this.jumpAcceleration = 15//ЖЖЖ
            jumpAudio.play()
        }
        else if (this.doubleJump == true) {
            this.jumpAcceleration = 15
            this.doubleJump = false
            jumpAudio.play()
        }
        else {
            return
        }
    }
}

// Класс врагов
class Enemy extends Entity {
    static array = []           // Массив врагов
    static count                // Количество врагов в массиве
    speed                       // Скорость врага
    isExists                    // Существует ли на данный момент враг

    constructor(x, y, sizeX, sizeY, visible, imageId) {
        super(x, y, sizeX, sizeY, false, imageId)

        this.isExists = false

        if (visible == true) {
            this.Show()
        }
    }

    // Инициализация массива врагов
    static InitArray() {
        for (let i = 0; i < this.count; i++) {
            this.array[i] = new Enemy(enemyCreationPosition, surfacePosition - 60, 30, 60, false, 'small-cactus')
        }
    }

    // Поиск свободного места в массиве для врагов
    static GetFreeEnemySlot() {
        for (let i = 0; i < this.count; i++) {
            if (this.array[i].isExists == false) {
                return i
            }
        }
        return -1
    }

    // Враги создаются через случайный промежуток времени, вычисленный в enemyCreationTime
    static CreateEnemy() {
        let freeSlot = this.GetFreeEnemySlot()
        // 0 - маленький кактус 1 - большой кактус 2 - самолёт
        let enemyType

        if (timer > enemyCreationTime && Math.random() > 0.9) {

            if (freeSlot != -1) {

                if (score < 2000) {
                    enemyType = parseInt(Math.random() * 100) % 2
                }
                else {
                    enemyType = parseInt(Math.random() * 100) % 3
                }

                switch (enemyType) {
                    case 0:
                        this.array[freeSlot].ReloadImage('small-cactus')
                        this.array[freeSlot].sizeX = 20
                        this.array[freeSlot].sizeY = 30
                        this.array[freeSlot].y = surfacePosition - this.array[freeSlot].sizeY
                        this.array[freeSlot].speed = surfaceSpeed
                        break
                    case 1:
                        this.array[freeSlot].ReloadImage('big-cactus')
                        this.array[freeSlot].sizeX = 30
                        this.array[freeSlot].sizeY = 60
                        this.array[freeSlot].y = surfacePosition - this.array[freeSlot].sizeY
                        this.array[freeSlot].speed = surfaceSpeed
                        break
                    case 2:
                        this.array[freeSlot].ReloadImage('airplane')
                        this.array[freeSlot].sizeX = 50
                        this.array[freeSlot].sizeY = 20
                        this.array[freeSlot].y = surfacePosition - this.array[freeSlot].sizeY - 200
                        this.array[freeSlot].speed = airplaneSpeed + -parseInt((Math.random() * (5 + gameSpeed)) - (2 + parseInt(gameSpeed)))
                        break
                }

                this.array[freeSlot].Release()

                enemyCreationTime = timer + Math.random() * 200
            }
        }
    }

    // Выпускает врага в игру
    Release() {
        this.x = enemyCreationPosition
        this.isExists = true
        this.Show()
    }

    // Убирает из игры
    Disable() {
        this.Hide()
        this.isExists = false
    }
}

class Bonus extends Entity {

    sinY

    constructor(x, y, sizeX, sizeY, visible, imageId) {
        super(x, y, sizeX, sizeY, false, imageId)

        this.sinY = this.y

        if (visible == true) {
            this.Show()
        }
    }

    GetBonus(e) {}

    MoveSinY() {
        this.y = this.sinY + Math.sin(Math.PI * ((timer % 1000) / 100)) * 50
    }
}

class InvulnerableBonus extends Bonus {
    GetBonus(e) {
        e.invulnerableTime += 1750
    }
}

class SlowTimeBonus extends Bonus {
    GetBonus(e) {
        e.slowTime += 1750
        saveGameSpeed = gameSpeed
        gameSpeed = 0
        isSlowTime = true
    }
}

// Выполниение кода после загрузки страницы
window.onload = function() {
    // Загрузка canvas и получение контекста
    let cnv = document.getElementById('canvas')
    context = cnv.getContext('2d')

    // Загружаем фон
    backgroundImage = document.getElementById('background');

    // Инициализация игры
    InitGame()
}

function StartGame() {
    InitGame()
    gameIsRunning = true

    // Закрываем доступ к кнопке
    document.getElementById('start').disabled = true
}

function StopGame() {
    gameIsRunning = false
    document.getElementById('start').disabled = false

    if (score > maxScore) {
        maxScore = score
        ShowScore()
    }

    deadAudio.play()
}

// Установка начальных значений перед началом игры
function InitGame() {
    // Рисуем фон
    context.drawImage(backgroundImage, 0, 0)

    // Инициализируем переменные и объекты начальными значениями
    hero = new Hero(50, surfacePosition - 39, 45, 39, true, 'hero', 'hero2')
    bonus = null
    Enemy.count = 10
    Enemy.InitArray()
    score = 0
    timer = 0
    enemyCreationTime = 0
    gameSpeed = 0
    isSlowTime = false
}

// Показывает счёт на экране
function ShowScore() {
    context.font = "25px arial"
    context.fillText("Record:" + maxScore, 800, 30)
    context.fillText("Score:" + score, 800, 60)
}

// Функция процесса игры - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function Control() {
    // Проверка, запущена ли игра
    if (gameIsRunning == false) {
        return
    }

    // Обработка прыжка игрока
    if (hero.isJumping == true) {
        // Проверка на выход главного персонажа за границы поверхности земли
        if (hero.y + hero.sizeY + -hero.jumpAcceleration > surfacePosition) {
            hero.Move(50, surfacePosition - hero.sizeY)
            hero.isJumping = false
            hero.doubleJump = true
        }
        else {
            hero.MoveRel(0, parseInt(-hero.jumpAcceleration))
            hero.jumpAcceleration -= gravitation
        }
    }

    // Обработка бонусов игрока
    if (hero.invulnerableTime > 0) {
        hero.invulnerableTime -= 1
    }

    if (isSlowTime == true && hero.slowTime > 0) {
        hero.slowTime -= 1
    }
    else if (isSlowTime == true && hero.slowTime == 0) {
        isSlowTime = false
        gameSpeed += saveGameSpeed
        saveGameSpeed = 0
    }

    // Обработка сущностей

    // Создание сущностей
    Enemy.CreateEnemy()

    // Обработка движения сущностей, выхода их за границы
    for (let i = 0; i < Enemy.count; i++) {
        if (Enemy.array[i].isExists == true) {
            Enemy.array[i].MoveRel(-Enemy.array[i].speed - gameSpeed, 0)
            if (Enemy.array[i].x < enemyDestructionPosition) {
                Enemy.array[i].Disable()
            }
        }
    }

    // Обработка столкновений игрока с сущностями
    for (let i = 0; i < Enemy.count; i++) {
        if (hero.invulnerableTime == 0 && Entity.CheckCollision(hero, Enemy.array[i]) == true) {
            StopGame()
        }
    }

    // Обработка бонусов

    // Создание бонусов
    if (timer != 0 && timer % 2500 == 0 && bonus == null) {
        let bonusType = parseInt(Math.random() * 10) % 2

        switch (bonusType) {
            case 0:
                bonus = new InvulnerableBonus(enemyCreationPosition, surfacePosition - 250, 10, 10, true, 'invulnerable-bonus')
                break
            case 1:
                bonus = new SlowTimeBonus(enemyCreationPosition, surfacePosition - 250, 10, 10, true, 'slow-time-bonus')
                break
        }
    }

    // Движение бонусов
    if (bonus != null) {
        bonus.MoveRel(-1, 0)
        bonus.MoveSinY()

        if (bonus.x < enemyDestructionPosition) {
            bonus = null
        }
    }

    // Столкновение игрка с бонусом
    if (bonus != null && Entity.CheckCollision(hero, bonus) == true) {
        bonus.GetBonus(hero)
        bonus.Hide()
        bonus = null
    }

    // Перерисовка объектов
    context.drawImage(backgroundImage, 0, 0)
    hero.Show()
    for (let i = 0; i < Enemy.count; i++) {
        if (Enemy.array[i].isExists == true) {
            Enemy.array[i].Show()
        }
    }
    if (bonus != null) {
        bonus.Show()
    }
    ShowScore()

    // обновление таймера и счёта
    timer++
    score++
    if (score % 1000 == 0) {
        gameSpeed += 1
    }
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

setInterval(Control, 20)

// Управление

function Jump() {
    if (gameIsRunning == true) {
        hero.TryJump()
    }
}

document.addEventListener('keydown', function(event) {
    if (event.key == " ") {
        Jump()
    }
})
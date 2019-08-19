import random

humanChoices = []
cpChoices = []
turnCount = 0

for x in range(4):
    cpChoices.append(random.randint(1, 6))
    #cpChoices.append(randint(1, 6))
    
print("The Computer has chosen 4 colors.")
print("The colors are labeled by the numbers as followed")
print("  1) Red")
print("  2) Blue")
print("  3) Yellow")
print("  4) Green")
print("  5) Black")
print("  6) White")

while cpChoices != humanChoices and turnCount <10:
    turnCount += 1
    positionsRight = 0
    colorsRight = 0
    humanChoices = list(map(int, input('Enter numbers: ').split()))
    
    if cpChoices == humanChoices:
        print("That's Correct!")
        print("It took you ", turnCount, " turn(s)!")
        break
    else:
        colorsRight = 0
        positionsRight = 0
        counter2 = 20
        p1 = []
        c1 = []
        for x in range(4):
            if cpChoices[x] == humanChoices[x]:
                positionsRight += 1
        for i in range(4):
            p1.append(humanChoices[i])
            c1.append(cpChoices[i])
        #checks how many colors you got right.
        for x in range(4):
            for i in range(4):
                if p1[i] == c1[x]:
                    colorsRight = colorsRight + 1
                    c1[x] = counter2 + 1
                    counter2 += 1
                    p1[i] = counter2 + 1
                    counter2 += 1
        
    print("Black Pegs: ", positionsRight, ", White Pegs: ", (colorsRight - positionsRight), ".")
            
if turnCount == 10:
    print("That was your 10th turn. You ran out of turns.")
    print("You loose.")

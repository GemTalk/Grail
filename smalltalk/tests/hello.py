
def say_hello(to, excited):
    trailing_character = '.'
    if excited:
        trailing_character = '!'
    print('Hello ' + to + trailing_character)

to = 'Will'
say_hello(to, True)

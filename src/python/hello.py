
def say_hello(to, excited):
    trailing_character = '.'
    if excited:
        trailing_character = '!'
    print('Hello ' + to + trailing_character)

friend = 'Allen'
say_hello(friend, True)

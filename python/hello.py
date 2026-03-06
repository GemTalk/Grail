
def say_hello(to, excited):
    trailing_character = '.'
    if excited:
        trailing_character = '!'
    print('Hello ' + to + trailing_character)

to = 'Allen'
say_hello(to, True)


# | say_hello to |
# say_hello := [:positional :keywords |
#     to := positional ___at___: 1.
#     excited := positional ___at___: 2.
#     [
#       | trailing_character |
#         trailing_character := '.'.
#         excited ifTrue: [trailing_character := '!'].
#         print('Hello ' , to , trailing_character)
#     ] value.
# ].
# to := 'Allen'.
# say_hello value: {to. true} value: nil.

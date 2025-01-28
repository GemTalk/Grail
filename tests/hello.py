
def say_hello(to, excited):
    trailing_character = '.'
    if excited:
        trailing_character = '!'
    print('Hello ' + to + trailing_character)

to = 'Will'
say_hello(to, True)


# 	| currentScope |
# 	currentScope := PyGlobals new.
# 	currentScope setHelperSymbols: #(say_hello to ) asIdentitySet.
# 	currentScope at: #say_hello put: (FunctionDef new params: { #to. #excited. }; kwonlyargs: { }; vararg: #None; kwarg: #None; kw_defaults: { }; defaults: { }; block: [:currentScope |
# 		currentScope setHelperSymbols: #(trailing_character ) asIdentitySet.
# 		currentScope at: #trailing_character put: (str ___value: '.').
# 		(currentScope at: #excited) ___value ifTrue: [
# 			currentScope at: #trailing_character put: (str ___value: '!')
# 		].
# 		(currentScope at: #print) scope: currentScope positional: { (((str ___value: ''Hello '') __add__: (currentScope at: #to)) __add__: (currentScope at: #trailing_character)). } named: {}.
# 	]; yourself).
# 	currentScope at: #to put: (str ___value: 'Will').
# 	(currentScope at: #say_hello) scope: currentScope positional: { (currentScope at: #to). True. } named: {}.

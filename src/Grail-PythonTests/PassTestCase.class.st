Class {
	#name : 'PassTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
PassTestCase >> testPass [
	"Test pass as a standalone statement."

	self assert: (self eval: 'pass
42') equals: 42.

]

{ #category : 'Grail-Tests' }
PassTestCase >> testPassInFunction [
	"Test pass as a function body placeholder."

	self assert: (self eval: 'def noop():
    pass
noop()') equals: None.

]

{ #category : 'Grail-Tests' }
PassTestCase >> testPassInIf [
	"Test pass in an if branch."

	self assert: (self eval: 'x = 5
if x > 10:
    pass
x') equals: 5.

]

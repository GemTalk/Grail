Class {
	#name : 'RaiseTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
RaiseTestCase >> testBareRaise [
	"Test bare raise re-raises the current exception."

	self should: [self eval: 'try:
    raise ValueError("original")
except ValueError:
    raise'] raise: ValueError.

]

{ #category : 'Grail-Tests' }
RaiseTestCase >> testRaiseClass [
	"Test raise with just an exception class (no args)."

	self should: [self eval: 'raise TypeError'] raise: TypeError.

]

{ #category : 'Grail-Tests' }
RaiseTestCase >> testRaiseInFunction [
	"Test raise inside a function."

	self should: [self eval: 'def fail():
    raise ValueError("oops")
fail()'] raise: ValueError.

]

{ #category : 'Grail-Tests' }
RaiseTestCase >> testRaiseInstance [
	"Test raise with an exception instance."

	self should: [self eval: 'raise ValueError("bad value")'] raise: ValueError.

]

{ #category : 'Grail-Tests' }
RaiseTestCase >> testRaiseMessage [
	"Test that the message from raise is preserved."

	| msg |
	[
		self eval: 'raise ValueError("test message")'.
	] on: ValueError do: [:ex |
		msg := ex description.
	].
	self assert: msg = 'ValueError: test message'.

]

! ------------------- Remove existing behavior from PyWhile
expectvalue /Metaclass3       
doit
PyWhile removeAllMethods.
PyWhile class removeAllMethods.
%
! ------------------- Class methods for PyWhile
! ------------------- Instance methods for PyWhile
set compile_env: 0
category: 'other'
method: PyWhile
_body
	^ body
%
category: 'other'
method: PyWhile
_orelse
	^ orelse
%
category: 'other'
method: PyWhile
_test
	^ test
%
category: 'other'
method: PyWhile
children

	^super children
		add: test;
		add: body;
		add: orelse;
		yourself
%
category: 'other'
method: PyWhile
evaluate
	[
		[
			test evaluate.
		] whileTrue: [
			[
				body do: [:each | each evaluate].
			] on: ContinueNotification do: [:ex |
				ex return.
			].
		].
	] on: BreakNotification do: [:ex | 
		ex return.
	].
	orelse do: [:each | each evaluate].
%
category: 'other'
method: PyWhile
initialize
	"While(expr test, stmt* body, stmt* orelse)"

	test := self expression.
	self commaSpace.
	body := PySuite parent: self.
	self commaSpace.
	orelse := PySuite parent: self.
	self readPosition.
%

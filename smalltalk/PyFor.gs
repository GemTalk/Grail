! ------------------- Remove existing behavior from PyFor
expectvalue /Metaclass3       
doit
PyFor removeAllMethods.
PyFor class removeAllMethods.
%
! ------------------- Class methods for PyFor
! ------------------- Instance methods for PyFor
set compile_env: 0
category: 'other'
method: PyFor
addMissingPositions

	super addMissingPositions. 
	target addMissingPositions.
	iter addMissingPositions.
	body do: [:each | each addMissingPositions].
	orelse do: [:each | each addMissingPositions].
%
category: 'other'
method: PyFor
evaluate

	[
		iter evaluate do: [:i | 
			[
				parent variableAt: target put: i.
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
method: PyFor
initialize
	"For(expr target, expr iter, stmt* body, stmt* orelse)"

	target := self expression.
	self commaSpace. 
	iter := self expression. 
	self commaSpace.
	body := self suite. 
	self commaSpace. 
	orelse := self suite.
	self readPosition.
%

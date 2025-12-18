! ------------------- Remove existing behavior from AssignAst
removeallmethods AssignAst
removeallclassmethods AssignAst
! ------------------- Class methods for AssignAst
! ------------------- Instance methods for AssignAst
category: 'other'
method: AssignAst
addVariableNamesTo: aStream

	targets do: [:each | 
		each addVariableNamesTo: aStream.
	].
%
category: 'other'
method: AssignAst
initialize
	"Assign(expr* targets, expr value, string? type_comment)"

	targets := self collectAst: [self expression].
	self commaSpace.
	value := self expression.
	self commaSpace.
	type_comment := self optionalString.
	self readPosition.
%
category: 'other'
method: AssignAst
printSmalltalkOn: aStream

	aStream nextPutAll: 'value := '.
	value printSmalltalkOn: aStream.
	aStream nextPutAll: '.'; lf.
	(targets at: 1) printSmalltalkAssignmentOn: aStream.
	aStream nextPutAll: '.'; lf; nextPutAll: 'None'.
%
category: 'other'
method: AssignAst
target

	^targets at: 1
%

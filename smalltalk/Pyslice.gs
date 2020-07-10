! ------------------- Remove existing behavior from Pyslice
expectvalue /Metaclass3       
doit
Pyslice removeAllMethods.
Pyslice class removeAllMethods.
%
! ------------------- Class methods for Pyslice
set compile_env: 0
category: 'other'
classmethod: Pyslice
sliceFrom: aNode

| symbol class |
	symbol := ('Py' , (aNode stream upTo: $()) asSymbol.
	class := PythonGlobals at: symbol.
	^class parent: aNode
%
! ------------------- Instance methods for Pyslice
set compile_env: 0
category: 'other'
method: Pyslice
assign: aValue to: aVariable
	self subclassResponsibility.
%
category: 'other'
method: Pyslice
evaluate: aList
	self subclassResponsibility
%

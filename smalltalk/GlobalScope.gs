! ------------------- Remove existing behavior from GlobalScope
expectvalue /Metaclass3       
doit
GlobalScope removeAllMethods.
GlobalScope class removeAllMethods.
%
! ------------------- Class methods for GlobalScope
set compile_env: 0
category: 'other'
classmethod: GlobalScope
new

	self error: 'use #newForNode:'.
%
category: 'other'
classmethod: GlobalScope
newForNode: anAstNode

	^self 
		outer: (GsCurrentSession currentSession objectNamed: #'Builtins') current
		node: anAstNode
%
! ------------------- Instance methods for GlobalScope
set compile_env: 0
category: 'other'
method: GlobalScope
globals

	^self
%

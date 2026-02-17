! ===============================================================================
! ExecBlock Methods (Python callable blocks)
! ===============================================================================
! This file contains Python method implementations for the ExecBlock class.
! These methods allow code blocks returned from Python built-in functions to be
! called with arguments using Python-style syntax.
!
! These methods are compiled with environmentId 2 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from ExecBlock
expectvalue /Metaclass3
doit
ExecBlock removeAllMethods: 2.
ExecBlock class removeAllMethods: 2.
%

set compile_env: 2

category: 'Python-Callable'
method: ExecBlock
__call__: args
	"Call the block with the given arguments.
	 This makes ExecBlock callable in Python's sense."

	^ self perform: #valueWithArguments: env: 0 withArguments: {args}
%

category: 'Python-Block Evaluation'
method: ExecBlock
value
	"Evaluate a zero-argument block"

	^ self perform: #value env: 0
%

category: 'Python-Block Evaluation'
method: ExecBlock
value: arg1
	"Evaluate a one-argument block"

	^ self perform: #value: env: 0 withArguments: {arg1}
%

category: 'Python-Block Evaluation'
method: ExecBlock
value: arg1 value: arg2
	"Evaluate a two-argument block"

	^ self perform: #value:value: env: 0 withArguments: {arg1. arg2}
%

category: 'Python-Block Evaluation'
method: ExecBlock
value: arg1 value: arg2 value: arg3
	"Evaluate a three-argument block"

	^ self perform: #value:value:value: env: 0 withArguments: {arg1. arg2. arg3}
%

category: 'Python-Block Evaluation'
method: ExecBlock
value: arg1 value: arg2 value: arg3 value: arg4
	"Evaluate a four-argument block"

	^ self perform: #value:value:value:value: env: 0 withArguments: {arg1. arg2. arg3. arg4}
%

category: 'Python-Block Evaluation'
method: ExecBlock
value: arg1 value: arg2 value: arg3 value: arg4 value: arg5
	"Evaluate a five-argument block"

	^ self perform: #value:value:value:value:value: env: 0 withArguments: {arg1. arg2. arg3. arg4. arg5}
%

category: 'Python-Block Evaluation'
method: ExecBlock
valueWithArguments: anArray
	"Evaluate the block with an array of arguments"

	^ self perform: #valueWithArguments: env: 0 withArguments: {anArray}
%

set compile_env: 0

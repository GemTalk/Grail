! ===============================================================================
! ExecBlock Methods (Python callable blocks)
! ===============================================================================
! This file contains Python method implementations for the ExecBlock class.
! These methods allow code blocks returned from Python built-in functions to be
! called with arguments using Python-style syntax.
!
! These methods are compiled with environmentId 1 (Python) to keep them separate
! from the base Smalltalk methods (environmentId 0).
! ===============================================================================

! ------------------- Remove existing Python methods from ExecBlock
expectvalue /Metaclass3
doit
ExecBlock removeAllMethods: 1.
ExecBlock class removeAllMethods: 1.
%

set compile_env: 1

category: 'Python-Callable'
method: ExecBlock
__call__: args
	"Call the block with the given arguments.
	 This makes ExecBlock callable in Python's sense."

	^ self @env0:valueWithArguments: args
%

category: 'Python-Block Evaluation'
method: ExecBlock
value
	"Evaluate a zero-argument block"

	^ self @env0:value
%

category: 'Python-Block Evaluation'
method: ExecBlock
value: arg1
	"Evaluate a one-argument block"

	^ self @env0:value: arg1
%

category: 'Python-Block Evaluation'
method: ExecBlock
value: arg1 value: arg2
	"Evaluate a two-argument block"

	^ self @env0:value: arg1 value: arg2
%

category: 'Python-Block Evaluation'
method: ExecBlock
value: arg1 value: arg2 value: arg3
	"Evaluate a three-argument block"

	^ self @env0:value: arg1 value: arg2 value: arg3
%

category: 'Python-Block Evaluation'
method: ExecBlock
value: arg1 value: arg2 value: arg3 value: arg4
	"Evaluate a four-argument block"

	^ self @env0:value: arg1 value: arg2 value: arg3 value: arg4
%

category: 'Python-Block Evaluation'
method: ExecBlock
value: arg1 value: arg2 value: arg3 value: arg4 value: arg5
	"Evaluate a five-argument block"

	^ self @env0:value: arg1 value: arg2 value: arg3 value: arg4 value: arg5
%

category: 'Python-Block Evaluation'
method: ExecBlock
valueWithArguments: anArray
	"Evaluate the block with an array of arguments"

	^ self @env0:valueWithArguments: anArray
%

set compile_env: 0

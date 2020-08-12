! ------------------- Remove existing behavior from _thread
expectvalue /Metaclass3       
doit
_thread removeAllMethods.
_thread class removeAllMethods.
%
! ------------------- Class methods for _thread
set compile_env: 0
category: 'other'
classmethod: _thread
moduleName

	^#'_thread'
%
! ------------------- Instance methods for _thread
set compile_env: 0
category: 'initialization'
method: _thread
initialize
"
	https://docs.python.org/3.7/library/_thread.html
"
	super initialize.
	globals 
		at: #'__class__'						put: module;
		at: #'error'								put: RuntimeError;
		at: #'LockType'						put: 'This is the type of lock objects.';
		at: #'TIMEOUT_MAX'				put: SmallInteger maximumValue;

		at: #'allocate_lock'					put: [:arguments :keywords :scope | self allocate_lock];
		at: #'exit'								put: [:arguments :keywords :scope | self exit];
		at: #'get_ident'						put: [:arguments :keywords :scope | self get_ident];
		at: #'interrupt_main'					put: [:arguments :keywords :scope | self interrupt_main];
		at: #'stack_size'						put: [:arguments :keywords :scope | self stack_size: (arguments at: 1)];
		at: #'start_new_thread'			put: [:arguments :keywords :scope | self start_new_thread: (arguments at: 1) arguments: arguments keywords: keywords scope: scope];
		yourself.
%

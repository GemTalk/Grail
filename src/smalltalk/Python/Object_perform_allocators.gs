! ===============================================================================
! Object env-0 ___new___ bridge allocators
! ===============================================================================
! These bridge an env-0 class-side send to the env-1 __new__ allocator, so env-0
! code can construct a Python object without writing `@env1:__new__:' by hand.
! They ARE used: env-0 senders write `SomeClass ___new___: arg' (unprefixed,
! because the sending method is itself env-0) -- e.g. the exception test cases do
! `ArithmeticError ___new___: msg', and other env-0 construction paths use the
! 2-/3-arg forms.
!
! On a MODERN kernel (MR #6 per-environment session-method storage) these are
! filed PER-USER as env-0 session methods on Object -- Object is not a restricted
! class -- via install.gs.  No SystemUser step is needed, and the old env-0/env-1
! ___new___:_: / ___new___:_:_: selector collision is gone: per-env storage keeps
! the env-0 bridges and the env-1 `object class>>___new___:_:' convenience methods
! (Object.gs) separate.
!
! On a LEGACY kernel (3.7.5 / pre-MR#6) they are filed once as SystemUser via
! install_base.gs (persistent, shared) because the selector-keyed session store
! there keys by selector only, so an env-1 ___new___:_: would clobber the env-0
! one.
!
! Target the kernel class `Object' directly (in Globals) so this file compiles
! without the per-user Python dictionary on the symbol list -- `object' and
! `Object' are the identical class object.
! ===============================================================================

set compile_env: 0

category: 'Grail-Bridge'
classmethod: Object
___new___: arg
	"Convenience method: self perform: #__new__: env: 1 withArguments: {arg}"
	^ self @env1:__new__: arg
%

category: 'Grail-Bridge'
classmethod: Object
___new___: arg1 _: arg2
	"Convenience method: self perform: #__new__:_: env: 1 withArguments: {arg1. arg2}"
	^ self @env1:__new__: arg1 _: arg2
%

category: 'Grail-Bridge'
classmethod: Object
___new___: arg1 _: arg2 _: arg3
	"Convenience method: self perform: #__new__:_:_: env: 1 withArguments: {arg1. arg2. arg3}"
	^ self @env1:__new__: arg1 _: arg2 _: arg3
%

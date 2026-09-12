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
! These are filed PER-USER as env-0 session methods on Object -- Object is not a
! restricted class -- via install.gs.  No SystemUser step is needed, and there is
! no env-0/env-1 ___new___:_: / ___new___:_:_: selector collision: MR #6's
! per-environment session-method storage keeps the env-0 bridges and the env-1
! `object class>>___new___:_:' convenience methods (Object.gs) separate.
!
! That per-env storage is why 3.7.x needed a shared SystemUser filing of this
! file and 4.0 does not: a pre-MR#6 session store keys by selector ONLY, so an
! env-1 ___new___:_: clobbered the env-0 one.  3.7.x is no longer supported.
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

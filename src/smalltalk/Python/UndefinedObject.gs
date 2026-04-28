! ===============================================================================
! UndefinedObject (nil) — env-1 DNU backstop for unbound-name detection
! ===============================================================================
! Per the Grail design, nil is the "undefined" value and never a legitimate
! Python value. None is the singleton, distinct from nil. So any env-1 message
! send to nil represents a Python local being read before assignment, or a
! Smalltalk-bridge leak that bypassed Phase D. Convert it to an
! UnboundLocalError so user code sees a Python-shaped error instead of a
! Smalltalk MessageNotUnderstood.
!
! Loaded as SystemUser since UndefinedObject is a Smalltalk base class.
!
! This is a *backstop*: the codegen-level definite-assignment check
! (Phase C-2) is expected to catch unbound reads at the LOAD site with the
! variable name. The DNU here only fires when the value reaches a message
! send, which loses the source line and the variable name. It is still
! useful when the codegen check is missing or incorrect.
!
! Implementation note: GemStone's runtime dispatches DNU to the receiver's
! env-0 ``doesNotUnderstand:args:envId:`` method, regardless of the env in
! which the original (failed) send happened. The envId is a *parameter* so
! the override below sees env 1 vs env 0 and only intercepts env 1; env-0
! sends still get the standard MessageNotUnderstood, leaving normal
! Smalltalk semantics unchanged.

set compile_env: 0

category: 'Python-Bridge'
method: UndefinedObject
doesNotUnderstand: aSymbol args: anArray envId: envId
	"Catch env-1 message sends to nil and raise UnboundLocalError. For env-0
	messages, fall through to the standard handler so non-Python code sees
	a regular MessageNotUnderstood."

	envId = 1 ifFalse: [
		^ super doesNotUnderstand: aSymbol args: anArray envId: envId
	].
	^ UnboundLocalError @env1:___signal___:
		('local variable referenced before assignment (received '
			, aSymbol printString
			, ' on nil)')
%

category: 'Python-Bridge'
method: UndefinedObject
cantPerform: aSymbol withArguments: anArray env: envId
	"Symmetric handler for the perform:env: dispatch path."

	envId = 1 ifFalse: [
		^ super cantPerform: aSymbol withArguments: anArray env: envId
	].
	^ UnboundLocalError @env1:___signal___:
		('local variable referenced before assignment (received '
			, aSymbol printString
			, ' on nil)')
%

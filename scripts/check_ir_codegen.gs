! ===============================================================================
! Probe: can this product build a method through IR?
! ===============================================================================
! Builds a throwaway env-1 method with GsNMethod generateFromIR:, runs it, and
! checks that it answers 4242.  Nothing is installed or committed.
!
! The IR path is ON by default, and the version guards in ./install.sh cannot
! tell whether a 4.0 build carries the builder API it needs.  Measured on 4.0.0
! build 2026-08-05: the kernel's own GsComMethNode >> selector: sends #envId,
! which nothing implements, so every IR method build raises and the install
! fails minutes later at the gemdb deploy, inside importlib.  This probe fails
! the same way in seconds, before anything is built.
!
! It uses ONLY kernel classes, because it runs before Grail is loaded, and it
! goes through the same setters PyMethodIRBuilder >> initClass:selector:env:
! uses (selector:, bodyEnv:selectorEnv:, class:, source:).  Do not replace the
! build with a check such as (GsComMethNode canUnderstand: #envId): measured on
! 4.0.0.a8, that answers false and selector: works anyway.
!
! Output contract (parsed by install.sh):
!   * prints  GRAIL_IR=ok              when the method builds and answers 4242
!   * prints  GRAIL_IR=fail: <reason>  when anything else happens
!   * prints  neither                  if login itself fails -- install.sh has
!                                      already checked the login by then.
! ===============================================================================

iferr 1 stk
iferr 2 stk
login

run
"The GsCom* classes live only in GsCompilerClasses, which a fresh user's
symbol list does not hold: Grail's own preload adds it, and this probe runs
before that.  Naming them directly compiled here, where Grail was already
installed, and failed to compile on CI's fresh extent, so the probe printed
nothing.  So reach them through GsCompilerClasses, which is in Globals, and
leave the symbol list alone."
| result comp |
comp := GsCompilerClasses.
result := [ | m ret meth answer |
	m := (comp at: #GsComMethNode) newSmalltalk.
	m selector: #grailIRCodegenProbe;
		bodyEnv: 1 selectorEnv: 1;
		class: Object.
	m source: ''.
	m fileName: 'check_ir_codegen'.
	ret := (comp at: #GsComReturnNode) new
		return: ((comp at: #GsComLiteralNode) newInteger: 4242).
	ret lineNumber: 1.
	m appendStatement: ret.
	meth := GsNMethod generateFromIR: m.
	(meth isKindOf: GsNMethod)
		ifFalse: [ 'generateFromIR: answered ' , meth printString ]
		ifTrue: [
			meth environmentId = 1
				ifFalse: [ 'the method is in environment ' , meth environmentId printString , ', not 1' ]
				ifTrue: [
					answer := nil performMethod: meth.
					answer = 4242
						ifTrue: [ nil ]
						ifFalse: [ 'the method answered ' , answer printString , ', not 4242' ] ] ] ]
	on: Error
	do: [:e | e return: e class name , ' ' , e number printString , ', ' , e messageText asString ].
result isNil
	ifTrue:  [ GsFile stdout nextPutAll: 'GRAIL_IR=ok'; lf; flush ]
	ifFalse: [ GsFile stdout nextPutAll: 'GRAIL_IR=fail: ' , result; lf; flush ].
true
%

logout

! ===============================================================================
! One-time base-extent setup: env-1 session methods on GemStone 4.0
! ===============================================================================
! Run ONCE per 4.0 extent, as SystemUser, before ./install.sh:
!
!     topaz -l -S scripts/session_methods_env1_base_40.gs
!
! (install_base.sh applies this ONLY when a 4.0+ build LACKS native env-1 session
! methods -- i.e. GemStone MR #6 is absent, as detected by
! scripts/detect_env1_session_methods.gs.  A 4.0 build WITH MR #6 routes env-1
! through GsPackagePolicy natively and needs no patch, so this script is skipped.
! The 3.7.x sibling is session_methods_env1_base_37.gs.)
!
! Grail installs its ~196 env-1 kernel-class extensions (str/CharacterCollection,
! Set, SequenceableCollection, Fraction, Object, Class, ...) as PER-USER SESSION
! METHODS via GsPackagePolicy, so the shared kernel classes are never modified and
! multiple developers can install on one stone without conflict.
!
! 4.0 ships MR #6's session-method framework, but its GsPackagePolicy routing runs
! for environment 0 ONLY: Behavior>>compileMethod:...environmentId:methodDictEnvId:
! gates the ``GsPackagePolicy methodAndCategoryDictionaryFor:'' consultation on
! ``envZero'' (environmentId = 0).  For an env-1 (Python) method the policy is never
! asked, so the compile falls to the normal path and does
!   GsObjectSecurityPolicy setCurrent: self objectSecurityPolicy while: [ ... ]
! against the class's OWN policy -- which for a shared kernel class is
! SystemObjectSecurityPolicy(#1, Owner SystemUser).  A per-user (non-SystemUser)
! ./install.sh then fails with SecurityError 2257 ("No authorization to set the
! current security policy to SystemObjectSecurityPolicy") on the first kernel-class
! env-1 method (Class).
!
! Two methods are recompiled (SystemUser):
!   1. Behavior>>compileMethod:dictionaries:category:environmentId:methodDictEnvId:
!      -- consult GsPackagePolicy for env-1 as well as env-0.
!      methodAndCategoryDictionaryFor: self-guards (returns {nil.nil} unless the
!      policy is enabled AND permits a session method for this class), so a
!      persistent (non-session) compile is unaffected: Grail's OWN classes live in
!      the Python* dicts, are not permitted, and still compile persistently into
!      their own (install-user-owned) policy.
!   2. GsPackagePolicy>>permitSessionMethodFor:selector: -- guard
!      ``aBehavior thisClass name asSymbol'' against anonymous classes (name is
!      Smalltalk nil OR the Python None singleton), e.g. Django utils.functional
!      lazy() proxies compiled at runtime.  Same fix as the 3.7.x patch.
!
! NOTE: this deliberately does NOT touch 4.0's updateMethodLookupCacheFor:in: or
! its session-method (re)build path -- those are MR #6's per-environment machinery
! and are left as GemStone ships them.  When 4.0 gains full env-1 session-method
! support, this script becomes unnecessary.
! ===============================================================================

set user SystemUser pass swordfish
iferr 1 stk
iferr 2 exit 1
login

set compile_env: 0

! ------------------- Fix 1: route env-1 method compilation through GsPackagePolicy
category: 'Updating the Method Dictionary'
method: Behavior
compileMethod: sourceString dictionaries: aSymbolList category: aCategoryString
  environmentId: environmentId methodDictEnvId: methodDictEnv
	"This compiles some source code for the receiver.  See the shipped comment;
	 the only Grail change is that the GsPackagePolicy consultation below is no
	 longer gated on environmentId = 0, so env-1 (Python) methods on shared kernel
	 classes are captured as per-user session methods instead of failing the normal
	 compile path on the class's SystemUser-owned object security policy."

	| symList categ mDict cDict meth policy envZero dictsArray |
	self _validatePrivilege
		ifFalse: [ ^ nil ].

	aSymbolList class == SymbolList
		ifTrue: [ symList := aSymbolList ]
		ifFalse: [
			aSymbolList _validateClass: Array.
			symList := SymbolList withAll: aSymbolList ].
	categ := aCategoryString asSymbol.
	envZero := (environmentId + environmentId) == 0 .

	"Grail 4.0: consult the policy for EVERY environment (was: envZero only).
	 methodAndCategoryDictionaryFor: returns {nil.nil} unless the policy is
	 enabled AND permits a session method for this class, so persistent
	 (non-session) compiles are unaffected."
	dictsArray := (policy := GsPackagePolicy current)
		methodAndCategoryDictionaryFor: self source: sourceString dictionaries: aSymbolList category: categ.
	mDict := dictsArray at: 1.
	cDict := dictsArray at: 2.

	mDict ifNotNil: [
			meth := self compileMethod: sourceString dictionaries: symList category: categ
				        intoMethodDict: mDict intoCategories: cDict environmentId: environmentId.
			policy updateMethodLookupCacheFor: meth in: self.
			environmentId == 0
				ifTrue: [ policy setStamp: self changeStamp forBehavior: self forMethod: meth selector ].
			^ meth
	] ifNil: [ | unpackagedBlk |
		unpackagedBlk := [
				GsObjectSecurityPolicy
					setCurrent: self objectSecurityPolicy
					while: [
						meth := self compileMethod: sourceString dictionaries: symList category: categ
										 intoMethodDict: nil intoCategories: nil
											 environmentId: environmentId methodDictEnvId: methodDictEnv .
						(environmentId == 0 and: [ policy enabled ])
							ifTrue: [ policy setStamp: self changeStamp forBehavior: self forMethod: meth selector ].
						^ meth ]
		].
		^ envZero ifTrue:[
				self _rwCompileMethodForConditionalPackaging: sourceString symbolList: symList
					category: categ environmentId: environmentId ifUnpackagedDo: unpackagedBlk .
		] ifFalse:[
			unpackagedBlk value
		]
	]
%

! ------------------- Fix 2: anonymous-class guard in permitSessionMethodFor:
category: 'session methods support'
method: GsPackagePolicy
permitSessionMethodFor: aBehavior selector: selector

  | cl thisName |
  cl := aBehavior whichClassIncludesSelector: selector.
  cl ifNotNil: [ (cl compiledMethodAt: selector) _isProtected ifTrue: [ ^false ].  ].
  "Guard anonymous classes: their `name' is not a String -- it is Smalltalk nil
   OR the Python None singleton -- so asSymbol raises a DNU.  An unnamed class
   can't be in restrictedClasses and can't be looked up in externalSymbolList, so
   route purely by writability (a user-created anonymous class is writable, so its
   methods compile persistently, not as session methods)."
  thisName := [ aBehavior thisClass name asSymbol ] on: Error do: [:e | nil].
  thisName ifNil: [ ^ (aBehavior canWriteMethodsEnv: 0) not ].
  (self class restrictedClasses includes: thisName ) ifTrue: [ ^false ].
  externalSymbolList do: [:symDict |
		| possible |
		possible := symDict at: thisName otherwise: nil.
		(possible isBehavior and: [aBehavior theNonMetaClass isVersionOf: possible theNonMetaClass])
			ifTrue: [ ^true ].
  ].
  ^ (aBehavior canWriteMethodsEnv: 0) not
%

run
System commitTransaction.
GsFile stdout nextPutAll: 'session_methods_env1_base_40: patched Behavior>>compileMethod: (env-1 routing) + GsPackagePolicy>>permitSessionMethodFor:selector:'; lf; flush.
%
logout
exit 0

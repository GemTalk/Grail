! ===============================================================================
! One-time base-extent setup: env-1 session methods on GemStone 4.0
! ===============================================================================
! Run ONCE per 4.0 extent, as SystemUser, before ./install.sh:
!
!     topaz -l -S scripts/session_methods_env1_base_40.gs
!
! (install_base.sh selects this on 4.0.x; the 3.7.x sibling is
! session_methods_env1_base_37.gs.)
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
! Four methods are recompiled (SystemUser):
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
!   3. GsPackagePolicy>>updateMethodLookupCacheForSelector:method:in: -- the
!      INCREMENTAL install path invoked from (1) as each session method is compiled.
!      Stock 4.0 hardcodes environment 0 (transientMethodDictForEnv: 0 ... put:,
!      _refreshLookupCache:...env: 0), so an env-1 (Python) method compiled onto a
!      shared kernel class is installed into that class's ENV-0 transient dict and
!      is invisible to env-1 sends.  Route by the method's own ``environmentId''
!      instead.  install.sh depends on this at file-in time -- the first env-1
!      kernel-extension invocation is the numbers ABC registry's
!      ``IdentitySet ___new___'' (env 1), which MNUs without it.
!   4. GsPackagePolicy>>buildSessionMethodDictionary -- the FULL rebuild run at
!      login / enable / disable.  Same hardcoded ``envId := 0'': every committed
!      session method, whatever its environment, is rebuilt into env-0 transient
!      dicts.  Without this fix env-1 kernel extensions work only in the session
!      that compiled them and vanish on the next login (fresh run_tests.sh workers,
!      long-lived MCP sessions, ...).  Partition captured methods by
!      GsNMethod>>environmentId and install a per-environment transient method
!      dictionary for each; env-0 behaviour (incl. the Unicode16 compare TMDs) is
!      preserved exactly.
!
! Fixes 3 and 4 complete MR #6's per-environment session-method support for the two
! environments Grail uses (0 and 1); stock 4.0 wires the compile/lookup/rebuild path
! to env 0 only.  When the base image handles every environment natively this script
! becomes unnecessary.
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

! ------------------- Fix 3: env-aware INCREMENTAL session-method install
category: 'session methods support'
method: GsPackagePolicy
updateMethodLookupCacheForSelector: selector method: aGsMethod in: aBehavior
  "Grail 4.0: env-aware incremental session-method install.  The shipped version
   hardcodes environment 0, so an env-1 (Python) method captured as a session
   method is installed into the class's env-0 transient dict + lookup cache and is
   invisible to env-1 sends.  Route everything by the method's own environmentId."
  <primitive: 2001>  "enter protected mode"
  | prot |
  prot := System _protectedMode .
  [
    | mDict oldMeth env |
    env := aGsMethod environmentId .
    mDict := aBehavior transientMethodDictForEnv: env .
    mDict ifNil: [
      mDict := GsSessionMethodDictionary new.
      self sessionMethodsSet add: aBehavior .
      aBehavior transientMethodDictForEnv: env put: mDict .
    ] ifNotNil:[
       oldMeth := mDict at: selector otherwise: nil .
    ].
    oldMeth ifNil:[
       "find oldMeth if possible so breakpoints are cleared"
       oldMeth := aBehavior compiledMethodAt: selector environmentId: env otherwise: nil
    ].
    mDict at: selector put: aGsMethod.
    aBehavior _refreshLookupCache: selector oldMethod: oldMeth env: env.
    self sessionMethodChanged .
  ] ensure:[
    prot _leaveProtectedMode
  ].
%

! ------------------- Fix 4: env-aware FULL session-method rebuild
category: 'session methods support'
method: GsPackagePolicy
buildSessionMethodDictionary
 "returns receiver.
  Grail 4.0: env-aware full rebuild.  The shipped version hardcodes envId := 0 and
  installs EVERY committed session method into transientMethodDictForEnv: 0, so
  env-1 (Python) kernel-class session methods are invisible to env-1 lookup after a
  fresh login.  This override partitions captured methods by
  GsNMethod>>environmentId and installs a per-environment transient method
  dictionary for each (environments 0 and 1).  Env-0 behaviour, including the
  Unicode16 compare transient dicts, is preserved exactly."
 <primitive: 2001>  "enter protected mode"
 | prot |
 prot := System _protectedMode .
 [ | smSet clsDictByEnv oldSet oldList reenableAlmostOfMemoryThreshold |
    (AlmostOutOfMemory enabled and: [ TransactionBoundaryDefaultPolicy isActive ])
      ifTrue: [
        (GsCurrentSession currentSession objectNamed: 'SessionMethodTransactionBoundaryPolicy')
          ifNotNil: [ reenableAlmostOfMemoryThreshold := AlmostOutOfMemory threshold ] ].
    (smSet := IdentitySet _basicNew) _setNoStubbing .
    "environmentId -> ( IdentityDictionary: behavior -> GsSessionMethodDictionary )"
    clsDictByEnv := IdentityDictionary new .
    clsDictByEnv at: 0 put: IdentityDictionary new .
    clsDictByEnv at: 1 put: IdentityDictionary new .
    (Unicode16 _unicodeCompareEnabled) ifTrue:[
      | mapping clsDict0 |
      clsDict0 := clsDictByEnv at: 0 .
      mapping := Unicode16 _unicodeCompareMapping .
      1 to: mapping size by: 2 do:[:index |
        | cls |
        cls := mapping at: index .
        clsDict0 at: cls put: (Unicode16 _unicodeCompareTmdForClass: cls selectors: (mapping at: index + 1)) .
        smSet add: cls .
      ].
    ].
    self enabled ifTrue:[ | rejected |
      rejected := { } .
      self _packageReverse_Do: [:package |
        package behaviorAndMethodDictDo: [:behavior :methodDict |
          methodDict keysAndValuesDo: [:k :v |
            (v class == GsNMethod)
              ifTrue:[ | env clsDict tmd |
                 env := v environmentId .
                 clsDict := clsDictByEnv at: env otherwise: nil .
                 clsDict isNil ifTrue:[ clsDict := IdentityDictionary new . clsDictByEnv at: env put: clsDict ].
                 tmd := clsDict at: behavior otherwise: nil .
                 tmd isNil ifTrue:[ tmd := GsSessionMethodDictionary new . clsDict at: behavior put: tmd ].
                 smSet add: behavior .
                 tmd at: k put: v ]
              ifFalse:[ rejected add: { package . behavior . k . v } ].
          ].
        ].
      ].
      rejected size ~~ 0 ifTrue:[
        ImproperOperation new object: rejected ; reason: 'buildSessionMethodDictionaryFail';
          signal: 'one or more values in package method dictionaries is not a GsNMethod'.
      ].
      oldSet := self _sessionMethodsSet: smSet .
      "Drop transient dicts for classes no longer carrying a session method in a
       given environment.  Guard each clear with the getter: transientMethodDictForEnv:put:
       removes the class from Module_pinnedClasses once ALL its env slots are nil, so an
       unguarded double-nil (env 0 then env 1 for an env-0-only class) fails with a
       not-in-collection error."
      oldSet ifNotNil:[
          oldList := oldSet asArray .
          clsDictByEnv keysAndValuesDo:[ :env :clsDict |
            1 to: oldList size do:[:n | | cls |
              cls := oldList at: n .
              ((clsDict includesKey: cls) not and: [ (cls transientMethodDictForEnv: env) notNil ])
                ifTrue: [ cls transientMethodDictForEnv: env put: nil ] ] ] ].
      clsDictByEnv keysAndValuesDo:[ :env :clsDict |
        clsDict keysAndValuesDo:[ :cls :dict |
          cls transientMethodDictForEnv: env put: dict ] ].
      clsDictByEnv keysDo:[ :env |
        GsCurrentSession currentSession enableSessionMethods: true env: env ].
    ] ifFalse:[
      oldSet := self _sessionMethodsSet: nil .
      oldSet ifNotNil:[
        oldList := oldSet asArray .
        1 to: oldList size do:[:n | | cls |
          cls := oldList at: n .
          (cls transientMethodDictForEnv: 0) notNil ifTrue: [ cls transientMethodDictForEnv: 0 put: nil ] .
          (cls transientMethodDictForEnv: 1) notNil ifTrue: [ cls transientMethodDictForEnv: 1 put: nil ] .
        ].
      ].
      GsCurrentSession currentSession enableSessionMethods: false env: 0 .
      GsCurrentSession currentSession enableSessionMethods: false env: 1 .
    ].
    Unicode16 _cacheUsingUnicodeCompares .
    reenableAlmostOfMemoryThreshold ifNotNil: [:threshold | AlmostOutOfMemory enableAtThreshold: threshold ] .
 ] ensure:[ prot _leaveProtectedMode ]
%

run
System commitTransaction.
GsFile stdout nextPutAll: 'session_methods_env1_base_40: patched Behavior>>compileMethod: (env-1 routing), GsPackagePolicy>>permitSessionMethodFor:selector:, updateMethodLookupCacheForSelector:method:in: (env-aware incremental install) + buildSessionMethodDictionary (env-aware rebuild)'; lf; flush.
%
logout
exit 0

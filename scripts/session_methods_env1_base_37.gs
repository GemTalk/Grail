! ===============================================================================
! One-time base-extent setup: env-1 session methods on GemStone 3.7.5
! ===============================================================================
! Run ONCE per 3.7.5 extent, as SystemUser, before ./install.sh:
!
!     topaz -l -S scripts/session_methods_env1_base_37.gs
!
! Grail installs its ~196 env-1 kernel-class extensions (str/CharacterCollection,
! Set, SequenceableCollection, Fraction, Object, Class, ...) as PER-USER SESSION
! METHODS via GsPackagePolicy, so the shared kernel classes are never modified and
! multiple developers can install on one stone without conflict.  Stock 3.7.5 wired
! session methods for environment 0 only; this patch threads an environment through
! the policy's install path so env-1 works too.
!
! This is the 3.7.5 STAND-IN for GemStone MR #6 ("Support session methods in
! environments other than 0", code.gemtalksystems.com/GemStone/gemstone !6), which
! implements the same capability properly for 4.0 with per-environment package
! storage (#sessionMethodsByEnv).  When Grail moves to 4.0 + MR #6, this script and
! the SystemUser sections of install.gs it enables are no longer needed.
!
! Three GsPackagePolicy methods are recompiled (SystemUser; requires
! CompilePrimitives for the <primitive: 2001> methods):
!   1. updateMethodLookupCacheForSelector:method:in: -- install a compiled session
!      method into the method's OWN environment (was hardcoded env 0).
!   2. buildSessionMethodDictionary -- rebuild one transient dict per (class, env),
!      keyed off each GsNMethod's environmentId; teardown guards non-installed envs.
!      NOTE: unlike MR #6, this reuses the single selector-keyed sessionMethods
!      store, so a class with the SAME selector in env 0 AND env 1 keeps only the
!      last-compiled one.  Grail avoids this by filing its two colliding env-0
!      allocators (Object class ___new___:_: / ___new___:_:_:) persistently (see
!      Object_perform.gs); MR #6's per-env storage removes the constraint.
!   3. permitSessionMethodFor:selector: -- guard `thisClass name asSymbol' against
!      anonymous classes (name is Smalltalk nil OR the Python None singleton), e.g.
!      Django utils.functional lazy() proxies compiled at runtime.  This bug also
!      exists in MR #6's permitSessionMethodFor:selector:environmentId: and should
!      be fixed there too.
! ===============================================================================

set user SystemUser pass swordfish
iferr 1 stk
iferr 2 exit 1
login

set compile_env: 0
category: 'session methods support'
method: GsPackagePolicy
updateMethodLookupCacheForSelector: selector method: aGsMethod in: aBehavior
  <primitive: 2001>
  | prot env |
  env := aGsMethod environmentId .
  prot := System _protectedMode .
  [ | mDict oldMeth |
    mDict := aBehavior transientMethodDictForEnv: env .
    mDict ifNil: [ mDict := GsSessionMethodDictionary new. self sessionMethodsSet add: aBehavior . aBehavior transientMethodDictForEnv: env put: mDict .
    ] ifNotNil:[ oldMeth := mDict at: selector otherwise: nil . ].
    oldMeth ifNil:[ oldMeth := aBehavior compiledMethodAt: selector environmentId: env otherwise: nil ].
    mDict at: selector put: aGsMethod.
    aBehavior _refreshLookupCache: selector oldMethod: oldMeth env: env.
    self sessionMethodChanged .
  ] ensure:[ prot _leaveProtectedMode ].
%

set compile_env: 0
category: 'session methods support'
method: GsPackagePolicy
buildSessionMethodDictionary
 <primitive: 2001>
 | prot |
 prot := System _protectedMode .
 [ | smSet clsDict oldSet oldList envSet reenableAlmostOfMemoryThreshold |
    (AlmostOutOfMemory enabled and: [ TransactionBoundaryDefaultPolicy isActive ]) ifTrue: [
		(GsCurrentSession currentSession objectNamed: 'SessionMethodTransactionBoundaryPolicy')
          ifNotNil: [ reenableAlmostOfMemoryThreshold := AlmostOutOfMemory threshold ] ].
    (smSet := IdentitySet _basicNew) _setNoStubbing .
    clsDict := IdentityDictionary new .
    envSet := IdentitySet new . envSet add: 0 ; add: 1 .
    (Unicode16 _unicodeCompareEnabled) ifTrue:[ | mapping |
      mapping := Unicode16 _unicodeCompareMapping .
      1 to: mapping size by: 2 do:[:index | | cls envMap |
        cls := mapping at: index .
        envMap := IdentityDictionary new .
        envMap at: 0 put: (Unicode16 _unicodeCompareTmdForClass: cls selectors: (mapping at: index + 1)) .
        clsDict at: cls put: envMap .
        smSet add: cls . ]. ].
    self enabled ifTrue:[ | rejected |
      rejected := { } .
      self _packageReverse_Do: [:package |
        package behaviorAndMethodDictDo: [:behavior :methodDict | | envMap |
	  (envMap := clsDict at: behavior otherwise: nil ) ifNil:[ envMap := IdentityDictionary new . clsDict at: behavior put: envMap . smSet add: behavior. ].
	  methodDict keysAndValuesDo: [:k :v | | menv tmd |
            v class == GsNMethod ifTrue:[
              menv := v environmentId .
              (tmd := envMap at: menv otherwise: nil) ifNil:[ tmd := GsSessionMethodDictionary new . envMap at: menv put: tmd ].
              tmd at: k put: v ]
            ifFalse:[ rejected add: { package . behavior . k . v } ]. ]. ]. ].
      rejected size ~~ 0 ifTrue:[ ImproperOperation new object: rejected ; reason: 'buildSessionMethodDictionaryFail'; signal: 'one or more values in package method dictionaries is not a GsNMethod'. ].
      oldSet := self _sessionMethodsSet: smSet .
      oldSet ifNotNil:[ oldList := oldSet asArray .
          1 to: oldList size do:[:n | | cls |
            cls := oldList at: n .
            envSet do: [:e | (cls transientMethodDictForEnv: e) notNil ifTrue: [ cls transientMethodDictForEnv: e put: nil ] ] ] ].
      clsDict keysAndValuesDo:[ :cls :envMap |
        envMap keysAndValuesDo: [:e :dict | cls transientMethodDictForEnv: e put: dict ] ].
      envSet do: [:e | GsCurrentSession currentSession enableSessionMethods: true env: e ].
    ] ifFalse:[
      oldSet := self _sessionMethodsSet: nil .
      oldSet ifNotNil:[ oldList := oldSet asArray .
        1 to: oldList size do:[:n | | cls seededEnvMap seeded0 |
          cls := oldList at: n .
          seededEnvMap := clsDict at: cls otherwise: nil .
          seeded0 := seededEnvMap ifNil: [nil] ifNotNil: [:m | m at: 0 otherwise: nil] .
          (cls transientMethodDictForEnv: 1) notNil ifTrue: [ cls transientMethodDictForEnv: 1 put: nil ] .
          seeded0 notNil
            ifTrue: [ cls transientMethodDictForEnv: 0 put: seeded0 ]
            ifFalse: [ (cls transientMethodDictForEnv: 0) notNil ifTrue: [ cls transientMethodDictForEnv: 0 put: nil ] ] . ]. ].
      GsCurrentSession currentSession enableSessionMethods: false env: 0 .
      GsCurrentSession currentSession enableSessionMethods: false env: 1 . ].
    Unicode16 _cacheUsingUnicodeCompares .
    reenableAlmostOfMemoryThreshold ifNotNil: [:threshold | AlmostOutOfMemory enableAtThreshold: threshold ] .
 ] ensure:[ prot _leaveProtectedMode ]
%

set compile_env: 0
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
GsFile stdout nextPutAll: 'session_methods_env1_base_37: patched GsPackagePolicy (updateMethodLookupCache, buildSessionMethodDictionary, permitSessionMethodFor:)'; lf; flush.
%
logout
exit 0

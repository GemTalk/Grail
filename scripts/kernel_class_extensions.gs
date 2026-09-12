! ===============================================================================
! Grail's extensions to shared kernel classes -- filed PER-USER.
! ===============================================================================
! `input`ed by src/smalltalk/install.gs (right after NoneType, so `None` is bound
! and before anything that dispatches to these).  Every method here lands in the
! installing user's OWN GrailSessionMethods package as an env-1 session method:
! committed, isolated, and re-installed into this session's transient method
! dictionaries at each login.  Nothing here is SystemUser-owned, so several users
! can each install their own Grail on one shared stone.
!
! That is a 4.0 property.  On 3.7.x these same files had to be filed ONCE as
! SHARED SystemUser methods (the old scripts/install_base37.gs), because a
! pre-MR#6 kernel refuses env-1 session methods on the GsPackagePolicy
! restrictedClasses -- GsNMethod / System / Repository / SymbolDictionary -- and
! a plain user lacks CompilePrimitives for the performMethod: primitives.  That
! shared filing is exactly what made two users on one stone overwrite each
! other's install.  3.7.x is no longer supported and this file is the whole of
! what replaced it.
!
! This file was scripts/install_base40.gs while both kernels were supported; the
! name said "base", but install.sh -- not install_base.sh -- has always been what
! files it.
! ===============================================================================

input src/smalltalk/Python/builtin_function_or_method.gs
input src/smalltalk/Python/System.gs
input src/smalltalk/Python/Repository.gs
input src/smalltalk/Python/SymbolDictionary.gs
input src/smalltalk/Python/ExecBlock.gs
input src/smalltalk/Python/Object_perform_allocators.gs
input src/smalltalk/Python/GsTestResult.gs
input src/smalltalk/Python/GsTestSuite.gs
input src/smalltalk/Python/AppendStream.gs


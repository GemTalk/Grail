! ===============================================================================
! Grail base marker (extent-global, SystemUser-owned)
! ===============================================================================
! install_base.sh runs this LAST -- on BOTH legacy and modern kernels -- so that
! ./install.sh's guard (scripts/check_base_installed.gs) has a UNIQUE, Grail-owned
! signal that the base setup completed here.  It writes a SystemUser-owned key into
! Globals, which a per-user ./install.sh can never do, so its presence
! unambiguously means install_base.sh ran to completion on this extent.
!
! This replaces the earlier heuristic of keying off Unicode comparison mode: a
! site could enable Unicode mode for its own reasons and thereby fake a "base
! present" verdict, whereas #GrailBaseInstalled is set by nothing but this script.
!
! The value is an integer base-schema version (currently 1).  The guard only
! checks presence, but storing a version lets a future install.sh detect and
! reject a STALE base if the base setup ever changes shape.
! ===============================================================================

set user SystemUser pass swordfish
iferr 1 stk
iferr 2 exit 1
login

run
Globals at: #GrailBaseInstalled put: 1.
System commitTransaction.
GsFile stdout nextPutAll: 'GrailBaseInstalled marker set (version 1).'; lf; flush.
true
%

logout

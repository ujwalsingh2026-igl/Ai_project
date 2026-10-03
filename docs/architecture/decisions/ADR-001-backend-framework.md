# ADR-001 Backend framework: Django + DRF
**Decision:** Django 5.2 LTS + Django REST Framework.
**Reason:** user is learning Django; built-in auth, admin, ORM, migrations, security defaults.
**Alternatives:** FastAPI (lighter, async-first, but we would build auth/admin ourselves), Flask.
**Advantages:** batteries included, LTS support, large docs. **Disadvantages:** heavier; async is less natural.
**Future impact:** React/Android clients talk to the same REST API.

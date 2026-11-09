from setuptools import setup, find_packages

setup(
    name="roadguard",
    version="1.0.0",
    packages=find_packages(where="roadguard-platform"),
    package_dir={"": "roadguard-platform"},
    install_requires=[
        "fastapi>=0.110.0",
        "uvicorn[standard]>=0.28.0",
        "pydantic>=2.6.0",
        "pydantic-settings>=2.2.0",
        "sqlalchemy>=2.0.28",
        "psycopg[binary]>=3.1.18",
        "psycopg2-binary>=2.9.9",
    ],
)

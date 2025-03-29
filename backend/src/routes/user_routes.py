from flask import Blueprint, jsonify, request, redirect, make_response
from src.database.transaction_database import TransactionDatabase
from src.database.user_database import UserDatabase


router_user = Blueprint('user', __name__)

@router_user.route('/users', methods=['GET'])
def get_users():
    users = UserDatabase.get_all_users()
    return jsonify(users)

@router_user.route('/users/id=<int:id>', methods=['GET'])
def get_user(id):
    user = UserDatabase.get_user_by_id(id)
    if user:
        return jsonify(user)
    return jsonify({"error": "User not found"}), 404

@router_user.route('/cadastro', methods=['POST'])
def create_user():
    data = request.form.to_dict()
    
    idUser = UserDatabase.create_user(
        nome=data['nome'],
        sobrenome=data['sobrenome'],
        email=data['email'],
        senha=data['senha']
    )
    
    if not idUser:
        return jsonify({"error": "Failed to create user"}), 500
    else:
        response = make_response(redirect("http://127.0.0.1:3000/inicio"))
        response.set_cookie("username", data['nome']) 
        response.set_cookie("idUser", f"{idUser}") 
    
        return response
    
@router_user.route('/perfil/id=<int:id>', methods=['POST','PUT'])
def update_user(id):
    data = {key: value for key, value in request.form.items() if value.strip()}
    if not data:
        return jsonify({"error": "Nenhum dado fornecido para atualização"}), 400

    UserDatabase.update_user(user_id=id, **data) 
    return jsonify({"message": "Usuário atualizado com sucesso!"})

@router_user.route('/users/id=<int:id>', methods=['DELETE'])
def delete_user(id):
    UserDatabase.delete_user(id)
    return jsonify({"message": "User deleted successfully"})

@router_user.route('/login', methods=['POST'])
def login():
    data = request.form.to_dict()
    print(f"Login attempt for email: {data['email']}")
    connect,user = UserDatabase.connect_user(data['email'], data['senha'])
    
    if connect:
        response = make_response(redirect("http://127.0.0.1:3000/inicio"))
        response.set_cookie("username", user['nome']) 
        response.set_cookie("idUser", f"{user['idUser']}") 
        return response

    return jsonify({"error": "Invalid email or password"}), 401


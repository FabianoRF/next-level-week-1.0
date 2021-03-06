import {Request, Response} from 'express';
import knex from '../database/connection'


class PointsController{
    async index(request: Request, response: Response){
        //filtro uf, items e cidade (Query params)
        const {city, uf, items} =request.query;
        //criando um array com os numeros dos itens que vieram da requisição
        const parsedItems=String(items)
            .split(',')
            .map(item => Number(item.trim()));//trim tira os espaçamentos da direita e da esquerda
         
        console.log('testeee ', parsedItems)
        const points = await knex('points')
            .join('point_items', 'points.id', '=', 'point_items.point_id')
            .whereIn('point_items.item_id', parsedItems)//where in verifica se o id enta dentro do array
            .where('city', String(city))
            .where('uf', String(uf))
            .distinct()
            .select('points.*');


        
        const serializedPoints = points.map(point => {//trasnformando os items no que se deseja
            return {
                ...point,
                image_url: `http://10.0.3.106:3333/uploads/${point.image}`,
            };
        });
        return response.json(serializedPoints)
    }


    async show(request: Request, response: Response){ 
        const { id }= request.params;

        const point = await knex('points').where('id', id).first();

        if(!point){
            return response.status(400).json({message: 'Point not found.'})
        }

        const serializedPoint = {//trasnformando os items no que se deseja
            ...point,
            image_url: `http://10.0.3.106:3333/uploads/${point.image}`,
        };

        const items= await knex('items')
            .join('point_items', 'items.id', '=', 'point_items.item_id')
            .where('point_items.point_id', id)
            .select('items.title');

        return response.json({point: serializedPoint, items});
    }

    async create(request: Request, response: Response){

        console.log(request.body)
        const {
            name,
            email,
            whatsapp,
            latitude,
            longitude,
            city,
            uf,
            items
        } = request.body;
    
        const trx = await knex.transaction();//esta variavel trata o possivel erro quando duas ou mais inserçoes estão no mesmo bloco, ou seja se uma não der certo a outra é impedida
        
        const point={
            image: request.file.filename,
            name,
            email,
            whatsapp, 
            latitude,
            longitude,
            city,
            uf,
        }

        const insertedIds = await trx('points').insert(point);//o insertedIds recebe todos os ids do insert
    
        const point_id = insertedIds[0];
        
        

        const pointItems = items
            .split(',')
            .map((item: string)=> Number(item.trim()))
            .map((item_id: number) =>{//retorna um objeto com os ids necessarios para a tabela point_items 
                return {
                    item_id,
                    point_id
                }
        })
    
        await trx('point_items').insert(pointItems);

        await trx.commit();//executam os insertss
    
        return response.json({
            id: point_id,
            ...point,//operador spread
        })
    }
    
}

export default PointsController;
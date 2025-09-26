import { IsNotEmpty, IsString, Matches, Length, IsBoolean } from "class-validator";

export class CreateCardTokenDto {

    @IsNotEmpty({ message: 'Karta raqami kiritilishi shart' })
    @IsString({ message: 'Karta raqami string formatida bo\'lishi kerak' })
    @Matches(/^\d{16,19}$/, { message: 'Karta raqami 16-19 ta raqamdan iborat bo\'lishi kerak' })
    card_number: string;

    @IsNotEmpty({ message: 'Expire date kiritilishi shart' })
    @IsString({ message: 'Expire date string formatida bo\'lishi kerak' })
    @Matches(/^\d{4}$/, { message: 'Expire date MMYY formatida bo\'lishi kerak (4 ta raqam)' })
    expire_date: string;

    @IsNotEmpty({ message: 'Temporary field kiritilishi shart' })
    @IsBoolean({ message: 'Temporary boolean qiymat bo\'lishi kerak' })
    temporary: boolean;

    @IsNotEmpty()
    userId: string;

    @IsNotEmpty()
    planId: string;

    @IsNotEmpty()
    telegramId: number;


}